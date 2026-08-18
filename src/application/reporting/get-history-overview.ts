import {
  DeliveryStatus,
  InvoiceStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export interface HistoryOverview {
  farmName: string;
  productionCycles: Array<{
    id: string;
    cycleCode: string;
    pondCode: string;
    species: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    harvestedKg: number;
    revenue: number;
    totalCost: number;
    profit: number;
  }>;
  salesOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    orderDate: Date;
    requestedDeliveryDate: Date | null;
    quantityKg: number;
    orderValue: number;
    deliveredKg: number;
    invoicedAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }>;
}

export async function getHistoryOverview(): Promise<HistoryOverview | null> {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;

  const [cycles, orders] = await Promise.all([
    db.productionCycle.findMany({
      where: { farmId: farm.id },
      include: {
        pond: true,
        species: true,
        harvests: true,
        expenses: true,
      },
      orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    db.salesOrder.findMany({
      where: { farmId: farm.id },
      include: {
        customer: true,
        items: true,
        deliveries: { include: { items: true } },
        invoices: { include: { payments: true } },
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  const productionCycles = cycles.map((cycle) => {
    const harvestedKg = cycle.harvests.reduce((sum, row) => sum + toNumber(row.weightKg), 0);
    const revenue = cycle.harvests.reduce((sum, row) => sum + toNumber(row.revenueAmount), 0);
    const totalCost = cycle.expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);

    return {
      id: cycle.id,
      cycleCode: cycle.cycleCode,
      pondCode: cycle.pond.code,
      species: cycle.species.commonName,
      status: cycle.status,
      startedAt: cycle.startedAt,
      completedAt: cycle.completedAt,
      harvestedKg,
      revenue,
      totalCost,
      profit: revenue - totalCost,
    };
  });

  const salesOrders = orders.map((order) => {
    const quantityKg = order.items.reduce((sum, row) => sum + toNumber(row.quantityKg), 0);
    const orderValue = order.items.reduce(
      (sum, row) => sum + toNumber(row.quantityKg) * toNumber(row.unitPricePerKg),
      0,
    );
    const deliveredKg = order.deliveries
      .filter((delivery) => delivery.status === DeliveryStatus.DELIVERED)
      .reduce(
        (sum, delivery) =>
          sum + delivery.items.reduce((inner, item) => inner + toNumber(item.quantityKg), 0),
        0,
      );
    const activeInvoices = order.invoices.filter((invoice) => invoice.status !== InvoiceStatus.VOID);
    const invoicedAmount = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
    const paidAmount = activeInvoices.reduce(
      (sum, invoice) =>
        sum + invoice.payments.reduce((inner, payment) => inner + toNumber(payment.amount), 0),
      0,
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status: order.status,
      orderDate: order.orderDate,
      requestedDeliveryDate: order.requestedDeliveryDate,
      quantityKg,
      orderValue,
      deliveredKg,
      invoicedAmount,
      paidAmount,
      outstandingAmount: Math.max(invoicedAmount - paidAmount, 0),
    };
  });

  return { farmName: farm.name, productionCycles, salesOrders };
}
