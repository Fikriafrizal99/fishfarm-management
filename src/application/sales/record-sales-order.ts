import {
  LeadStatus,
  OpportunityStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordSalesOrderCommand {
  farmId?: string;
  customerId: string;
  opportunityId?: string;
  speciesId: string;
  quantityKg: number;
  unitPricePerKg: number;
  requestedDeliveryDate?: Date;
  paymentTerms?: string;
  notes?: string;
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus lebih besar dari 0`);
  }
}

function orderDateCode(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function recordSalesOrder(command: RecordSalesOrderCommand) {
  assertPositive("Jumlah order", command.quantityKg);
  assertPositive("Harga jual", command.unitPricePerKg);

  if (command.requestedDeliveryDate && Number.isNaN(command.requestedDeliveryDate.getTime())) {
    throw new Error("Tanggal pengiriman tidak valid");
  }

  const farm = command.farmId
    ? await db.farm.findUnique({ where: { id: command.farmId } })
    : await db.farm.findFirst({ orderBy: { createdAt: "asc" } });

  if (!farm) throw new Error("Farm belum tersedia");

  return db.$transaction(async (tx) => {
    const [customer, species, opportunity] = await Promise.all([
      tx.customer.findFirst({
        where: { id: command.customerId, farmId: farm.id, active: true },
      }),
      tx.species.findUnique({ where: { id: command.speciesId } }),
      command.opportunityId
        ? tx.salesOpportunity.findFirst({
            where: { id: command.opportunityId, farmId: farm.id },
          })
        : Promise.resolve(null),
    ]);

    if (!customer) throw new Error("Customer tidak ditemukan atau tidak aktif");
    if (!species) throw new Error("Species tidak ditemukan");
    if (command.opportunityId && !opportunity) throw new Error("Opportunity tidak ditemukan");
    if (opportunity && opportunity.customerId !== customer.id) {
      throw new Error("Customer order harus sama dengan customer opportunity");
    }
    if (opportunity?.speciesId && opportunity.speciesId !== species.id) {
      throw new Error("Species order harus sama dengan species opportunity");
    }
    if (opportunity && opportunity.status !== OpportunityStatus.OPEN) {
      throw new Error("Hanya opportunity OPEN yang dapat dikonversi menjadi order");
    }

    const today = new Date();
    const dailyCount = await tx.salesOrder.count({
      where: {
        farmId: farm.id,
        orderNumber: { startsWith: `SO-${orderDateCode(today)}-` },
      },
    });
    const orderNumber = `SO-${orderDateCode(today)}-${String(dailyCount + 1).padStart(3, "0")}`;

    const order = await tx.salesOrder.create({
      data: {
        farmId: farm.id,
        customerId: customer.id,
        opportunityId: opportunity?.id,
        orderNumber,
        status: SalesOrderStatus.CONFIRMED,
        orderDate: today,
        requestedDeliveryDate: command.requestedDeliveryDate,
        paymentTerms: command.paymentTerms?.trim() || undefined,
        notes: command.notes?.trim() || undefined,
        items: {
          create: {
            speciesId: species.id,
            description: `${species.commonName} order`,
            quantityKg: command.quantityKg,
            unitPricePerKg: command.unitPricePerKg,
          },
        },
      },
      include: { customer: true, items: true },
    });

    if (opportunity) {
      await tx.salesOpportunity.update({
        where: { id: opportunity.id },
        data: { status: OpportunityStatus.WON },
      });
      if (opportunity.leadId) {
        await tx.lead.update({
          where: { id: opportunity.leadId },
          data: { status: LeadStatus.CONVERTED, customerId: customer.id },
        });
      }
    }

    return order;
  });
}
