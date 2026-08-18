import { CycleStatus, DeliveryStatus, InvoiceStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { calculateEstimatedBiomassKg, calculateEstimatedPopulation, calculateSurvivalRatePct } from "@/src/domain/kpi/biology";
import { calculateBiomassGainKg, calculateFcr } from "@/src/domain/kpi/growth";

function toNumber(value: unknown): number { return value === null || value === undefined ? 0 : Number(value); }
export type ReportingRange = { from?: Date; to?: Date };

export async function getHistoryOverview(range: ReportingRange = {}) {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;

  const completedDateFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } : undefined;
  const orderDateFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } : undefined;

  const [activeRaw, completedRaw, orders] = await Promise.all([
    db.productionCycle.findMany({
      where: { farmId: farm.id, status: { in: [CycleStatus.PLANNED, CycleStatus.ACTIVE, CycleStatus.HARVESTING] } },
      include: { pond: true, species: true, stockings: true, mortalityLogs: true, feedingLogs: true, samplingLogs: { orderBy: { sampledAt: "asc" } }, harvests: true, expenses: true },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.productionCycle.findMany({
      where: { farmId: farm.id, status: CycleStatus.COMPLETED, ...(completedDateFilter ? { completedAt: completedDateFilter } : {}) },
      include: { pond: true, species: true, harvests: true, expenses: true },
      orderBy: { completedAt: "desc" }, take: 50,
    }),
    db.salesOrder.findMany({
      where: { farmId: farm.id, ...(orderDateFilter ? { orderDate: orderDateFilter } : {}) },
      include: { customer: true, items: true, deliveries: { include: { items: true } }, invoices: { include: { payments: true } } },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }], take: 80,
    }),
  ]);

  const activeCycles = activeRaw.map((cycle) => {
    const stocked = cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
    const mortality = cycle.mortalityLogs.reduce((sum, row) => sum + row.quantity, 0);
    const harvestedFish = cycle.harvests.reduce((sum, row) => sum + (row.fishCount ?? 0), 0);
    const population = calculateEstimatedPopulation(stocked, mortality, harvestedFish);
    const latest = cycle.samplingLogs.at(-1);
    const abw = latest?.averageWeightG === null || latest?.averageWeightG === undefined ? null : Number(latest.averageWeightG);
    const biomass = abw === null ? null : calculateEstimatedBiomassKg(population, abw);
    const feed = cycle.feedingLogs.reduce((sum, row) => sum + toNumber(row.quantityKg), 0);
    const initialBiomass = cycle.stockings.reduce((sum, row) => sum + row.quantity * toNumber(row.avgWeightG) / 1000, 0);
    const harvestedKg = cycle.harvests.reduce((sum, row) => sum + toNumber(row.weightKg), 0);
    const biomassGain = biomass === null ? null : calculateBiomassGainKg({ standingBiomassKg: biomass, harvestedBiomassKg: harvestedKg, initialBiomassKg: initialBiomass });
    return {
      id: cycle.id, cycleCode: cycle.cycleCode, pondCode: cycle.pond.code, species: cycle.species.commonName, status: cycle.status,
      startedAt: cycle.startedAt, targetHarvestDate: cycle.targetHarvestDate, runningCost: cycle.expenses.reduce((sum, row) => sum + toNumber(row.amount), 0),
      stocked, estimatedPopulation: population, survivalRatePct: calculateSurvivalRatePct(population, stocked), averageWeightG: abw, estimatedBiomassKg: biomass,
      fcr: biomassGain === null ? null : calculateFcr(feed, biomassGain), harvestedKg,
    };
  });

  const completedCycles = completedRaw.map((cycle) => {
    const harvestedKg = cycle.harvests.reduce((sum, row) => sum + toNumber(row.weightKg), 0);
    const revenue = cycle.harvests.reduce((sum, row) => sum + toNumber(row.revenueAmount), 0);
    const totalCost = cycle.expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const profit = revenue - totalCost;
    return {
      id: cycle.id, cycleCode: cycle.cycleCode, pondCode: cycle.pond.code, species: cycle.species.commonName, status: cycle.status,
      startedAt: cycle.startedAt, completedAt: cycle.completedAt, harvestedKg, revenue, totalCost, profit,
      marginPct: revenue > 0 ? (profit / revenue) * 100 : null, actualHppPerKg: harvestedKg > 0 ? totalCost / harvestedKg : null,
    };
  });

  const salesOrders = orders.map((order) => {
    const quantityKg = order.items.reduce((sum, row) => sum + toNumber(row.quantityKg), 0);
    const orderValue = order.items.reduce((sum, row) => sum + toNumber(row.quantityKg) * toNumber(row.unitPricePerKg), 0);
    const deliveredKg = order.deliveries.filter((delivery) => delivery.status === DeliveryStatus.DELIVERED).reduce((sum, delivery) => sum + delivery.items.reduce((inner, item) => inner + toNumber(item.quantityKg), 0), 0);
    const activeInvoices = order.invoices.filter((invoice) => invoice.status !== InvoiceStatus.VOID);
    const invoicedAmount = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
    const paidAmount = activeInvoices.reduce((sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + toNumber(payment.amount), 0), 0);
    return { id: order.id, orderNumber: order.orderNumber, customerName: order.customer.name, status: order.status, orderDate: order.orderDate, requestedDeliveryDate: order.requestedDeliveryDate, quantityKg, orderValue, deliveredKg, invoicedAmount, paidAmount, outstandingAmount: Math.max(invoicedAmount - paidAmount, 0) };
  });

  return { farmName: farm.name, activeCycles, completedCycles, salesOrders };
}
