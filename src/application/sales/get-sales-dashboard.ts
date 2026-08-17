import {
  FulfillmentStatus,
  InvoiceStatus,
  LeadStatus,
  OpportunityStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface SalesDashboard {
  farmId: string;
  farmName: string;
  openLeads: number;
  pipelineValue: number;
  confirmedOrderValue: number;
  confirmedOrderKg: number;
  allocatedKg: number;
  availableHarvestedKg: number;
  outstandingReceivables: number;
  collectedThisMonth: number;
  upcomingLeads: Array<{
    id: string;
    title: string;
    status: LeadStatus;
    expectedDemandKg: number | null;
    expectedPricePerKg: number | null;
    nextFollowUpAt: Date | null;
  }>;
  activeOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    status: SalesOrderStatus;
    requestedDeliveryDate: Date | null;
    quantityKg: number;
    orderValue: number;
    allocatedKg: number;
  }>;
  inventoryLots: Array<{
    id: string;
    lotCode: string;
    species: string;
    pondCode: string;
    harvestedAt: Date;
    quantityKg: number;
    allocatedKg: number;
    availableKg: number;
  }>;
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function monthRangeJakarta(now: Date): { start: Date; end: Date } {
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = jakartaNow.getUTCFullYear();
  const month = jakartaNow.getUTCMonth();
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;

  return {
    start: new Date(Date.UTC(year, month, 1) - jakartaOffsetMs),
    end: new Date(Date.UTC(year, month + 1, 1) - jakartaOffsetMs),
  };
}

export async function getSalesDashboard(
  farmId?: string,
  now = new Date(),
): Promise<SalesDashboard | null> {
  const farm = farmId
    ? await db.farm.findUnique({ where: { id: farmId } })
    : await db.farm.findFirst({ orderBy: { createdAt: "asc" } });

  if (!farm) return null;

  const [leads, opportunities, orders, lots, invoices, payments] = await Promise.all([
    db.lead.findMany({
      where: {
        farmId: farm.id,
        status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED] },
      },
      orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    }),
    db.salesOpportunity.findMany({
      where: { farmId: farm.id, status: OpportunityStatus.OPEN },
    }),
    db.salesOrder.findMany({
      where: {
        farmId: farm.id,
        status: {
          in: [
            SalesOrderStatus.CONFIRMED,
            SalesOrderStatus.PARTIALLY_FULFILLED,
          ],
        },
      },
      include: {
        customer: true,
        items: { include: { allocations: true } },
      },
      orderBy: [{ requestedDeliveryDate: "asc" }, { orderDate: "desc" }],
    }),
    db.harvestLot.findMany({
      where: { farmId: farm.id },
      include: {
        species: true,
        harvest: {
          include: {
            cycle: { include: { pond: true } },
          },
        },
        allocations: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: {
        farmId: farm.id,
        status: {
          in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
        },
      },
      include: { payments: true },
    }),
    (() => {
      const { start, end } = monthRangeJakarta(now);
      return db.payment.findMany({
        where: {
          paidAt: { gte: start, lt: end },
          invoice: { farmId: farm.id },
        },
      });
    })(),
  ]);

  const pipelineValue = opportunities.reduce((sum, opportunity) => {
    if (
      opportunity.expectedQtyKg === null ||
      opportunity.expectedPricePerKg === null
    ) {
      return sum;
    }
    return (
      sum +
      toNumber(opportunity.expectedQtyKg) *
        toNumber(opportunity.expectedPricePerKg)
    );
  }, 0);

  const activeOrders = orders.map((order) => {
    const quantityKg = order.items.reduce(
      (sum, item) => sum + toNumber(item.quantityKg),
      0,
    );
    const orderValue = order.items.reduce(
      (sum, item) =>
        sum + toNumber(item.quantityKg) * toNumber(item.unitPricePerKg),
      0,
    );
    const allocatedKg = order.items.reduce(
      (sum, item) =>
        sum +
        item.allocations
          .filter((allocation) => allocation.status !== FulfillmentStatus.CANCELLED)
          .reduce((inner, allocation) => inner + toNumber(allocation.allocatedKg), 0),
      0,
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status: order.status,
      requestedDeliveryDate: order.requestedDeliveryDate,
      quantityKg,
      orderValue,
      allocatedKg,
    };
  });

  const inventoryLots = lots.map((lot) => {
    const allocatedKg = lot.allocations
      .filter((allocation) => allocation.status !== FulfillmentStatus.CANCELLED)
      .reduce((sum, allocation) => sum + toNumber(allocation.allocatedKg), 0);
    const quantityKg = toNumber(lot.quantityKg);

    return {
      id: lot.id,
      lotCode: lot.lotCode,
      species: lot.species.commonName,
      pondCode: lot.harvest.cycle.pond.code,
      harvestedAt: lot.harvest.harvestedAt,
      quantityKg,
      allocatedKg,
      availableKg: Math.max(quantityKg - allocatedKg, 0),
    };
  });

  const outstandingReceivables = invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce(
      (inner, payment) => inner + toNumber(payment.amount),
      0,
    );
    return sum + Math.max(toNumber(invoice.totalAmount) - paid, 0);
  }, 0);

  return {
    farmId: farm.id,
    farmName: farm.name,
    openLeads: leads.length,
    pipelineValue,
    confirmedOrderValue: activeOrders.reduce(
      (sum, order) => sum + order.orderValue,
      0,
    ),
    confirmedOrderKg: activeOrders.reduce(
      (sum, order) => sum + order.quantityKg,
      0,
    ),
    allocatedKg: activeOrders.reduce((sum, order) => sum + order.allocatedKg, 0),
    availableHarvestedKg: inventoryLots.reduce(
      (sum, lot) => sum + lot.availableKg,
      0,
    ),
    outstandingReceivables,
    collectedThisMonth: payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    ),
    upcomingLeads: leads.slice(0, 6).map((lead) => ({
      id: lead.id,
      title: lead.title,
      status: lead.status,
      expectedDemandKg:
        lead.expectedDemandKg === null ? null : toNumber(lead.expectedDemandKg),
      expectedPricePerKg:
        lead.expectedPricePerKg === null
          ? null
          : toNumber(lead.expectedPricePerKg),
      nextFollowUpAt: lead.nextFollowUpAt,
    })),
    activeOrders: activeOrders.slice(0, 6),
    inventoryLots: inventoryLots.slice(0, 6),
  };
}
