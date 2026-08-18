import { DeliveryStatus, InvoiceStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

function n(value: unknown): number { return value === null || value === undefined ? 0 : Number(value); }

export async function getCustomerCommercialProfile(customerId: string | undefined) {
  if (!customerId) return null;
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!farm) return null;

  const customer = await db.customer.findFirst({
    where: { id: customerId, farmId: farm.id },
    include: {
      opportunities: { orderBy: { createdAt: "desc" }, take: 10 },
      salesOrders: {
        include: {
          items: { include: { species: true } },
          deliveries: { include: { items: true } },
          invoices: { include: { payments: true } },
        },
        orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!customer) return null;

  const orders = customer.salesOrders.map((order) => {
    const quantityKg = order.items.reduce((sum, item) => sum + n(item.quantityKg), 0);
    const orderValue = order.items.reduce((sum, item) => sum + n(item.quantityKg) * n(item.unitPricePerKg), 0);
    const deliveredKg = order.deliveries
      .filter((delivery) => delivery.status === DeliveryStatus.DELIVERED)
      .reduce((sum, delivery) => sum + delivery.items.reduce((inner, item) => inner + n(item.quantityKg), 0), 0);
    const activeInvoices = order.invoices.filter((invoice) => invoice.status !== InvoiceStatus.VOID);
    const invoicedAmount = activeInvoices.reduce((sum, invoice) => sum + n(invoice.totalAmount), 0);
    const paidAmount = activeInvoices.reduce((sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + n(payment.amount), 0), 0);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      requestedDeliveryDate: order.requestedDeliveryDate,
      status: order.status,
      quantityKg,
      orderValue,
      averagePricePerKg: quantityKg > 0 ? orderValue / quantityKg : null,
      deliveredKg,
      invoicedAmount,
      paidAmount,
      outstandingAmount: Math.max(invoicedAmount - paidAmount, 0),
      products: order.items.map((item) => `${item.species.commonName} ${n(item.quantityKg)} kg`).join(", "),
    };
  });

  const summary = orders.reduce((acc, order) => ({
    orderCount: acc.orderCount + 1,
    quantityKg: acc.quantityKg + order.quantityKg,
    orderValue: acc.orderValue + order.orderValue,
    deliveredKg: acc.deliveredKg + order.deliveredKg,
    invoicedAmount: acc.invoicedAmount + order.invoicedAmount,
    paidAmount: acc.paidAmount + order.paidAmount,
    outstandingAmount: acc.outstandingAmount + order.outstandingAmount,
  }), { orderCount: 0, quantityKg: 0, orderValue: 0, deliveredKg: 0, invoicedAmount: 0, paidAmount: 0, outstandingAmount: 0 });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      customerType: customer.customerType,
      contactPerson: customer.contactPerson,
      whatsapp: customer.whatsapp,
      phone: customer.phone,
      email: customer.email,
      addressText: customer.addressText,
      notes: customer.notes,
    },
    summary: {
      ...summary,
      averageSellingPricePerKg: summary.quantityKg > 0 ? summary.orderValue / summary.quantityKg : null,
      lastOrderDate: orders[0]?.orderDate ?? null,
    },
    orders,
    opportunities: customer.opportunities,
  };
}
