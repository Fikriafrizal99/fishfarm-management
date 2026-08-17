import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CustomerType,
  InteractionType,
  InvoiceStatus,
  LeadStatus,
  OpportunityStatus,
  PaymentMethod,
  PrismaClient,
  SalesOrderStatus,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for Sales CRM seeding");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ids = {
  farm: "00000000-0000-4000-8000-000000000010",
  speciesNila: "00000000-0000-4000-8000-000000000020",
  user: "00000000-0000-4000-8000-000000000001",
  customerRestaurant: "10000000-0000-4000-8000-000000000001",
  customerWholesaler: "10000000-0000-4000-8000-000000000002",
  leadHotel: "10000000-0000-4000-8000-000000000101",
  opportunityRestaurant: "10000000-0000-4000-8000-000000000201",
  interactionLead: "10000000-0000-4000-8000-000000000301",
  salesOrder: "10000000-0000-4000-8000-000000000401",
  salesOrderItem: "10000000-0000-4000-8000-000000000402",
  invoice: "10000000-0000-4000-8000-000000000501",
  payment: "10000000-0000-4000-8000-000000000601",
};

async function main() {
  const restaurant = await prisma.customer.upsert({
    where: { id: ids.customerRestaurant },
    update: {
      name: "RM Sederhana Cianjur",
      customerType: CustomerType.RESTAURANT,
      contactPerson: "Pak Andi",
      whatsapp: "081200000101",
      active: true,
    },
    create: {
      id: ids.customerRestaurant,
      farmId: ids.farm,
      name: "RM Sederhana Cianjur",
      customerType: CustomerType.RESTAURANT,
      contactPerson: "Pak Andi",
      whatsapp: "081200000101",
      addressText: "Cianjur, Jawa Barat",
      notes: "Development customer — kebutuhan Nila mingguan",
      active: true,
    },
  });

  await prisma.customer.upsert({
    where: { id: ids.customerWholesaler },
    update: {
      name: "Pengepul Nila Cianjur",
      customerType: CustomerType.WHOLESALER,
      active: true,
    },
    create: {
      id: ids.customerWholesaler,
      farmId: ids.farm,
      name: "Pengepul Nila Cianjur",
      customerType: CustomerType.WHOLESALER,
      contactPerson: "Bu Rina",
      whatsapp: "081200000102",
      addressText: "Cianjur, Jawa Barat",
      active: true,
    },
  });

  await prisma.lead.upsert({
    where: { id: ids.leadHotel },
    update: {
      status: LeadStatus.CONTACTED,
      nextFollowUpAt: new Date("2026-08-19T03:00:00.000Z"),
    },
    create: {
      id: ids.leadHotel,
      farmId: ids.farm,
      speciesId: ids.speciesNila,
      title: "Hotel Cianjur — kebutuhan Nila mingguan",
      status: LeadStatus.CONTACTED,
      source: "Referral",
      contactName: "Purchasing Hotel",
      whatsapp: "081200000201",
      expectedDemandKg: 150,
      expectedPricePerKg: 24000,
      nextFollowUpAt: new Date("2026-08-19T03:00:00.000Z"),
      notes: "Development lead; belum bergantung pada stok/panen tertentu.",
    },
  });

  await prisma.customerInteraction.upsert({
    where: { id: ids.interactionLead },
    update: {
      summary: "Follow-up WhatsApp kebutuhan Nila 150 kg/minggu.",
      nextFollowUpAt: new Date("2026-08-19T03:00:00.000Z"),
    },
    create: {
      id: ids.interactionLead,
      farmId: ids.farm,
      leadId: ids.leadHotel,
      interactionType: InteractionType.WHATSAPP,
      occurredAt: new Date("2026-08-17T10:00:00.000Z"),
      summary: "Follow-up WhatsApp kebutuhan Nila 150 kg/minggu.",
      nextFollowUpAt: new Date("2026-08-19T03:00:00.000Z"),
      createdById: ids.user,
    },
  });

  const opportunity = await prisma.salesOpportunity.upsert({
    where: { id: ids.opportunityRestaurant },
    update: {
      status: OpportunityStatus.OPEN,
      expectedQtyKg: 100,
      expectedPricePerKg: 23500,
    },
    create: {
      id: ids.opportunityRestaurant,
      farmId: ids.farm,
      customerId: restaurant.id,
      speciesId: ids.speciesNila,
      title: "Repeat order Nila RM Sederhana",
      status: OpportunityStatus.OPEN,
      expectedQtyKg: 100,
      expectedPricePerKg: 23500,
      expectedCloseDate: new Date("2026-08-25T00:00:00.000Z"),
      notes: "Qualified demand independent from a specific harvest lot.",
    },
  });

  const order = await prisma.salesOrder.upsert({
    where: {
      farmId_orderNumber: {
        farmId: ids.farm,
        orderNumber: "SO-DEV-001",
      },
    },
    update: {
      customerId: restaurant.id,
      opportunityId: opportunity.id,
      status: SalesOrderStatus.CONFIRMED,
      requestedDeliveryDate: new Date("2026-08-25T00:00:00.000Z"),
    },
    create: {
      id: ids.salesOrder,
      farmId: ids.farm,
      customerId: restaurant.id,
      opportunityId: opportunity.id,
      orderNumber: "SO-DEV-001",
      status: SalesOrderStatus.CONFIRMED,
      orderDate: new Date("2026-08-17T00:00:00.000Z"),
      requestedDeliveryDate: new Date("2026-08-25T00:00:00.000Z"),
      paymentTerms: "DP + pelunasan saat pengiriman",
      notes: "Order development belum dialokasikan ke harvest lot.",
    },
  });

  await prisma.salesOrderItem.upsert({
    where: { id: ids.salesOrderItem },
    update: {
      quantityKg: 100,
      unitPricePerKg: 23500,
    },
    create: {
      id: ids.salesOrderItem,
      salesOrderId: order.id,
      speciesId: ids.speciesNila,
      description: "Nila konsumsi",
      quantityKg: 100,
      unitPricePerKg: 23500,
    },
  });

  const invoice = await prisma.invoice.upsert({
    where: {
      farmId_invoiceNumber: {
        farmId: ids.farm,
        invoiceNumber: "INV-DEV-001",
      },
    },
    update: {
      status: InvoiceStatus.PARTIALLY_PAID,
      subtotalAmount: 2350000,
      adjustmentAmount: 0,
      totalAmount: 2350000,
    },
    create: {
      id: ids.invoice,
      farmId: ids.farm,
      salesOrderId: order.id,
      invoiceNumber: "INV-DEV-001",
      status: InvoiceStatus.PARTIALLY_PAID,
      issueDate: new Date("2026-08-17T00:00:00.000Z"),
      dueDate: new Date("2026-08-25T00:00:00.000Z"),
      subtotalAmount: 2350000,
      adjustmentAmount: 0,
      totalAmount: 2350000,
      notes: "Development invoice with partial DP.",
    },
  });

  await prisma.payment.upsert({
    where: { id: ids.payment },
    update: {
      amount: 500000,
      method: PaymentMethod.TRANSFER,
    },
    create: {
      id: ids.payment,
      invoiceId: invoice.id,
      paidAt: new Date("2026-08-17T11:00:00.000Z"),
      amount: 500000,
      method: PaymentMethod.TRANSFER,
      reference: "DEV-DP-001",
      notes: "Development down payment",
      createdById: ids.user,
    },
  });

  console.log("Sales CRM development data seeded successfully.");
  console.log({
    customers: 2,
    openLead: "Hotel Cianjur — kebutuhan Nila mingguan",
    order: order.orderNumber,
    orderKg: 100,
    invoice: invoice.invoiceNumber,
    paid: 500000,
    allocation: "none — waiting for HarvestLot",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
