import {
  DeliveryStatus,
  InvoiceStatus,
  OpportunityStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export interface ReportOverview {
  farmName: string;
  production: {
    totalCycles: number;
    completedCycles: number;
    harvestedKg: number;
    revenue: number;
    cost: number;
    profit: number;
  };
  commercial: {
    customers: number;
    openOpportunities: number;
    pipelineValue: number;
    orders: number;
    orderKg: number;
    orderValue: number;
    deliveredKg: number;
    invoicedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
  };
  topCustomers: Array<{
    customerName: string;
    orderCount: number;
    quantityKg: number;
    orderValue: number;
    collectedAmount: number;
  }>;
}

export async function getReportOverview(): Promise<ReportOverview | null> {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;

  const [cycles, opportunities, orders, customerCount] = await Promise.all([
    db.productionCycle.findMany({
      where: { farmId: farm.id },
      include: { harvests: true, expenses: true },
    }),
    db.salesOpportunity.findMany({
      where: { farmId: farm.id, status: OpportunityStatus.OPEN },
    }),
    db.salesOrder.findMany({
      where: { farmId: farm.id, status: { not: SalesOrderStatus.CANCELLED } },
      include: {
        customer: true,
        items: true,
        deliveries: { include: { items: true } },
        invoices: { include: { payments: true } },
      },
    }),
    db.customer.count({ where: { farmId: farm.id, active: true } }),
  ]);

  const harvestedKg = cycles.reduce(
    (sum, cycle) => sum + cycle.harvests.reduce((inner, row) => inner + toNumber(row.weightKg), 0),
    0,
  );
  const productionRevenue = cycles.reduce(
    (sum, cycle) => sum + cycle.harvests.reduce((inner, row) => inner + toNumber(row.revenueAmount), 0),
    0,
  );
  const productionCost = cycles.reduce(
    (sum, cycle) => sum + cycle.expenses.reduce((inner, row) => inner + toNumber(row.amount), 0),
    0,
  );

  const pipelineValue = opportunities.reduce((sum, opportunity) => {
    if (opportunity.expectedQtyKg === null || opportunity.expectedPricePerKg === null) return sum;
    return sum + toNumber(opportunity.expectedQtyKg) * toNumber(opportunity.expectedPricePerKg);
  }, 0);

  let orderKg = 0;
  let orderValue = 0;
  let deliveredKg = 0;
  let invoicedAmount = 0;
  let collectedAmount = 0;
  const customerMap = new Map<string, ReportOverview["topCustomers"][number]>();

  for (const order of orders) {
    const quantity = order.items.reduce((sum, row) => sum + toNumber(row.quantityKg), 0);
    const value = order.items.reduce(
      (sum, row) => sum + toNumber(row.quantityKg) * toNumber(row.unitPricePerKg),
      0,
    );
    const delivered = order.deliveries
      .filter((delivery) => delivery.status === DeliveryStatus.DELIVERED)
      .reduce(
        (sum, delivery) => sum + delivery.items.reduce((inner, row) => inner + toNumber(row.quantityKg), 0),
        0,
      );
    const activeInvoices = order.invoices.filter((invoice) => invoice.status !== InvoiceStatus.VOID);
    const invoiced = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
    const collected = activeInvoices.reduce(
      (sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + toNumber(payment.amount), 0),
      0,
    );

    orderKg += quantity;
    orderValue += value;
    deliveredKg += delivered;
    invoicedAmount += invoiced;
    collectedAmount += collected;

    const current = customerMap.get(order.customerId) ?? {
      customerName: order.customer.name,
      orderCount: 0,
      quantityKg: 0,
      orderValue: 0,
      collectedAmount: 0,
    };
    current.orderCount += 1;
    current.quantityKg += quantity;
    current.orderValue += value;
    current.collectedAmount += collected;
    customerMap.set(order.customerId, current);
  }

  return {
    farmName: farm.name,
    production: {
      totalCycles: cycles.length,
      completedCycles: cycles.filter((cycle) => cycle.status === "COMPLETED").length,
      harvestedKg,
      revenue: productionRevenue,
      cost: productionCost,
      profit: productionRevenue - productionCost,
    },
    commercial: {
      customers: customerCount,
      openOpportunities: opportunities.length,
      pipelineValue,
      orders: orders.length,
      orderKg,
      orderValue,
      deliveredKg,
      invoicedAmount,
      collectedAmount,
      outstandingAmount: Math.max(invoicedAmount - collectedAmount, 0),
    },
    topCustomers: [...customerMap.values()]
      .sort((a, b) => b.orderValue - a.orderValue)
      .slice(0, 8),
  };
}
