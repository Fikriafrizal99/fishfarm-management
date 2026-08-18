import { CycleStatus, DeliveryStatus, InvoiceStatus, OpportunityStatus, SalesOrderStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { getDashboardOverview } from "@/src/application/dashboard/get-dashboard-overview";
import type { ReportingRange } from "./get-history-overview";

function toNumber(value: unknown): number { return value === null || value === undefined ? 0 : Number(value); }
const monthFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" });

export async function getReportOverview(range: ReportingRange = {}) {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;
  const dateFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } : undefined;

  const [dashboard, completedCycles, expenses, harvests, opportunities, orders, deliveries, invoices, payments, receivableInvoices, customerCount] = await Promise.all([
    getDashboardOverview(),
    db.productionCycle.findMany({ where: { farmId: farm.id, status: CycleStatus.COMPLETED, ...(dateFilter ? { completedAt: dateFilter } : {}) }, select: { id: true } }),
    db.expense.findMany({ where: { farmId: farm.id, ...(dateFilter ? { expenseDate: dateFilter } : {}) }, select: { expenseDate: true, amount: true } }),
    db.harvest.findMany({ where: { cycle: { farmId: farm.id }, ...(dateFilter ? { harvestedAt: dateFilter } : {}) }, select: { harvestedAt: true, weightKg: true, revenueAmount: true } }),
    db.salesOpportunity.findMany({ where: { farmId: farm.id, status: OpportunityStatus.OPEN } }),
    db.salesOrder.findMany({ where: { farmId: farm.id, status: { not: SalesOrderStatus.CANCELLED }, ...(dateFilter ? { orderDate: dateFilter } : {}) }, include: { customer: true, items: true } }),
    db.delivery.findMany({ where: { farmId: farm.id, status: DeliveryStatus.DELIVERED, ...(dateFilter ? { deliveredAt: dateFilter } : {}) }, include: { items: true } }),
    db.invoice.findMany({ where: { farmId: farm.id, status: { not: InvoiceStatus.VOID }, ...(dateFilter ? { issueDate: dateFilter } : {}) } }),
    db.payment.findMany({ where: { invoice: { is: { farmId: farm.id } }, ...(dateFilter ? { paidAt: dateFilter } : {}) }, include: { invoice: { include: { salesOrder: { include: { customer: true } } } } } }),
    db.invoice.findMany({ where: { farmId: farm.id, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] } }, include: { payments: true } }),
    db.customer.count({ where: { farmId: farm.id, active: true } }),
  ]);

  const productionCost = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const harvestedKg = harvests.reduce((sum, row) => sum + toNumber(row.weightKg), 0);
  const productionRevenue = harvests.reduce((sum, row) => sum + toNumber(row.revenueAmount), 0);
  const productionProfit = productionRevenue - productionCost;
  const pipelineValue = opportunities.reduce((sum, row) => sum + toNumber(row.expectedQtyKg) * toNumber(row.expectedPricePerKg), 0);
  const orderKg = orders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + toNumber(item.quantityKg), 0), 0);
  const orderValue = orders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + toNumber(item.quantityKg) * toNumber(item.unitPricePerKg), 0), 0);
  const deliveredKg = deliveries.reduce((sum, delivery) => sum + delivery.items.reduce((inner, item) => inner + toNumber(item.quantityKg), 0), 0);
  const invoicedAmount = invoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
  const collectedAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const outstandingAmount = receivableInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((inner, payment) => inner + toNumber(payment.amount), 0);
    return sum + Math.max(toNumber(invoice.totalAmount) - paid, 0);
  }, 0);

  const customerMap = new Map<string, { customerName: string; orderCount: number; quantityKg: number; orderValue: number; collectedAmount: number }>();
  for (const order of orders) {
    const row = customerMap.get(order.customerId) ?? { customerName: order.customer.name, orderCount: 0, quantityKg: 0, orderValue: 0, collectedAmount: 0 };
    row.orderCount += 1;
    row.quantityKg += order.items.reduce((sum, item) => sum + toNumber(item.quantityKg), 0);
    row.orderValue += order.items.reduce((sum, item) => sum + toNumber(item.quantityKg) * toNumber(item.unitPricePerKg), 0);
    customerMap.set(order.customerId, row);
  }
  for (const payment of payments) {
    const customerId = payment.invoice.salesOrder.customerId;
    const row = customerMap.get(customerId) ?? { customerName: payment.invoice.salesOrder.customer.name, orderCount: 0, quantityKg: 0, orderValue: 0, collectedAmount: 0 };
    row.collectedAmount += toNumber(payment.amount);
    customerMap.set(customerId, row);
  }

  type TrendRow = { key: string; cost: number; harvestKg: number; revenue: number; orderValue: number; collected: number };
  const trendMap = new Map<string, TrendRow>();
  const bucket = (date: Date) => { const key = monthFormatter.format(date); const current = trendMap.get(key) ?? { key, cost: 0, harvestKg: 0, revenue: 0, orderValue: 0, collected: 0 }; trendMap.set(key, current); return current; };
  expenses.forEach((row) => { bucket(row.expenseDate).cost += toNumber(row.amount); });
  harvests.forEach((row) => { const item = bucket(row.harvestedAt); item.harvestKg += toNumber(row.weightKg); item.revenue += toNumber(row.revenueAmount); });
  orders.forEach((order) => { bucket(order.orderDate).orderValue += order.items.reduce((sum, item) => sum + toNumber(item.quantityKg) * toNumber(item.unitPricePerKg), 0); });
  payments.forEach((payment) => { bucket(payment.paidAt).collected += toNumber(payment.amount); });

  return {
    farmName: farm.name,
    production: {
      activeCycles: dashboard?.activePonds ?? 0,
      completedCycles: completedCycles.length,
      harvestedKg,
      revenue: productionRevenue,
      cost: productionCost,
      profit: productionProfit,
      marginPct: productionRevenue > 0 ? (productionProfit / productionRevenue) * 100 : null,
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
      outstandingAmount,
      collectionRatePct: invoicedAmount > 0 ? (collectedAmount / invoicedAmount) * 100 : null,
    },
    cycleComparison: (dashboard?.cycles ?? []).map((cycle) => ({
      cycleId: cycle.cycleId, pondCode: cycle.pondCode, species: cycle.species, status: cycle.status,
      survivalRatePct: cycle.survivalRatePct, targetSrPct: cycle.targetSrPct, fcr: cycle.fcr, targetFcr: cycle.targetFcr,
      averageWeightG: cycle.averageWeightG, estimatedBiomassKg: cycle.estimatedBiomassKg, runningCost: cycle.totalCost,
    })),
    trend: [...trendMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    topCustomers: [...customerMap.values()].sort((a, b) => b.orderValue - a.orderValue).slice(0, 10),
  };
}
