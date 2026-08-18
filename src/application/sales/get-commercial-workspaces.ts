import {
  DeliveryStatus,
  InvoiceStatus,
  LeadStatus,
  OpportunityStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

async function firstFarmId(): Promise<string | null> {
  const farm = await db.farm.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return farm?.id ?? null;
}

export async function getOpportunityWorkspace() {
  const farmId = await firstFarmId();
  if (!farmId) return { customers: [], leads: [], species: [], opportunities: [] };

  const [customers, leads, species, opportunities] = await Promise.all([
    db.customer.findMany({
      where: { farmId, active: true },
      select: { id: true, name: true, customerType: true },
      orderBy: { name: "asc" },
    }),
    db.lead.findMany({
      where: {
        farmId,
        status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED] },
      },
      select: { id: true, title: true, status: true, speciesId: true },
      orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    }),
    db.species.findMany({
      where: { active: true },
      select: { id: true, commonName: true },
      orderBy: { commonName: "asc" },
    }),
    db.salesOpportunity.findMany({
      where: { farmId },
      include: {
        customer: true,
        lead: true,
        species: true,
        salesOrders: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: [{ status: "asc" }, { expectedCloseDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return { customers, leads, species, opportunities };
}

export async function getDeliveryWorkspace() {
  const farmId = await firstFarmId();
  if (!farmId) return { orderItems: [], deliveries: [] };

  const [items, deliveries] = await Promise.all([
    db.salesOrderItem.findMany({
      where: {
        salesOrder: {
          farmId,
          status: { notIn: [SalesOrderStatus.CANCELLED] },
        },
      },
      include: {
        species: true,
        salesOrder: { include: { customer: true } },
        allocations: true,
        deliveryItems: { include: { delivery: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.delivery.findMany({
      where: { farmId },
      include: {
        salesOrder: { include: { customer: true } },
        items: { include: { orderItem: { include: { species: true } } } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const orderItems = items
    .map((item) => {
      const allocatedKg = item.allocations
        .filter((allocation) => allocation.status !== "CANCELLED")
        .reduce((sum, allocation) => sum + Number(allocation.allocatedKg), 0);
      const bookedDeliveryKg = item.deliveryItems
        .filter((row) => row.delivery.status !== DeliveryStatus.CANCELLED)
        .reduce((sum, row) => sum + Number(row.quantityKg), 0);
      const deliveredKg = item.deliveryItems
        .filter((row) => row.delivery.status === DeliveryStatus.DELIVERED)
        .reduce((sum, row) => sum + Number(row.quantityKg), 0);
      return {
        id: item.id,
        salesOrderId: item.salesOrderId,
        orderNumber: item.salesOrder.orderNumber,
        customerName: item.salesOrder.customer.name,
        species: item.species.commonName,
        quantityKg: Number(item.quantityKg),
        allocatedKg,
        bookedDeliveryKg,
        deliveredKg,
        deliverableKg: Math.max(allocatedKg - bookedDeliveryKg, 0),
      };
    })
    .filter((item) => item.deliverableKg > 0);

  return { orderItems, deliveries };
}

export async function getInvoiceWorkspace() {
  const farmId = await firstFarmId();
  if (!farmId) return { orders: [], invoices: [] };

  const [orders, invoices] = await Promise.all([
    db.salesOrder.findMany({
      where: { farmId, status: { not: SalesOrderStatus.CANCELLED } },
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    }),
    db.invoice.findMany({
      where: { farmId },
      include: {
        salesOrder: { include: { customer: true } },
        payments: true,
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const invoiceableOrders = orders
    .map((order) => {
      const orderValue = order.items.reduce(
        (sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg),
        0,
      );
      const invoicedAmount = order.invoices
        .filter((invoice) => invoice.status !== InvoiceStatus.VOID)
        .reduce((sum, invoice) => sum + Number(invoice.subtotalAmount), 0);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        orderValue,
        invoicedAmount,
        remainingInvoiceable: Math.max(orderValue - invoicedAmount, 0),
      };
    })
    .filter((order) => order.remainingInvoiceable > 0);

  return { orders: invoiceableOrders, invoices };
}

export async function getPaymentWorkspace() {
  const farmId = await firstFarmId();
  if (!farmId) return { invoices: [], payments: [] };

  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: {
        farmId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      },
      include: {
        salesOrder: { include: { customer: true } },
        payments: true,
      },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
    }),
    db.payment.findMany({
      where: { invoice: { farmId } },
      include: {
        invoice: { include: { salesOrder: { include: { customer: true } } } },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const payableInvoices = invoices
    .map((invoice) => {
      const paidAmount = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const totalAmount = Number(invoice.totalAmount);
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.salesOrder.orderNumber,
        customerName: invoice.salesOrder.customer.name,
        totalAmount,
        paidAmount,
        outstandingAmount: Math.max(totalAmount - paidAmount, 0),
        dueDate: invoice.dueDate,
      };
    })
    .filter((invoice) => invoice.outstandingAmount > 0);

  return { invoices: payableInvoices, payments };
}
