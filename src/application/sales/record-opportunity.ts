import { LeadStatus, OpportunityStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordOpportunityCommand {
  farmId?: string;
  customerId: string;
  leadId?: string;
  speciesId?: string;
  title: string;
  expectedQtyKg?: number;
  expectedPricePerKg?: number;
  expectedCloseDate?: Date;
  notes?: string;
}

function assertOptionalPositive(label: string, value?: number): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} harus lebih besar dari 0`);
}

export async function recordOpportunity(command: RecordOpportunityCommand) {
  const title = command.title.trim();
  if (!title) throw new Error("Judul opportunity wajib diisi");
  assertOptionalPositive("Estimasi quantity", command.expectedQtyKg);
  assertOptionalPositive("Estimasi harga", command.expectedPricePerKg);
  if (command.expectedCloseDate && Number.isNaN(command.expectedCloseDate.getTime())) {
    throw new Error("Tanggal estimasi closing tidak valid");
  }

  const farm = command.farmId
    ? await db.farm.findUnique({ where: { id: command.farmId } })
    : await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) throw new Error("Farm belum tersedia");

  return db.$transaction(async (tx) => {
    const [customer, lead, species] = await Promise.all([
      tx.customer.findFirst({ where: { id: command.customerId, farmId: farm.id, active: true } }),
      command.leadId
        ? tx.lead.findFirst({ where: { id: command.leadId, farmId: farm.id } })
        : Promise.resolve(null),
      command.speciesId
        ? tx.species.findUnique({ where: { id: command.speciesId } })
        : Promise.resolve(null),
    ]);

    if (!customer) throw new Error("Customer tidak ditemukan atau tidak aktif");
    if (command.leadId && !lead) throw new Error("Lead tidak ditemukan");
    if (lead?.status === LeadStatus.LOST || lead?.status === LeadStatus.CONVERTED) {
      throw new Error("Lead yang sudah LOST/CONVERTED tidak dapat dijadikan opportunity baru");
    }
    if (command.speciesId && !species) throw new Error("Species tidak ditemukan");

    const opportunity = await tx.salesOpportunity.create({
      data: {
        farmId: farm.id,
        customerId: customer.id,
        leadId: lead?.id,
        speciesId: species?.id,
        title,
        status: OpportunityStatus.OPEN,
        expectedQtyKg: command.expectedQtyKg,
        expectedPricePerKg: command.expectedPricePerKg,
        expectedCloseDate: command.expectedCloseDate,
        notes: command.notes?.trim() || undefined,
      },
    });

    if (lead && lead.status !== LeadStatus.QUALIFIED) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.QUALIFIED, customerId: customer.id },
      });
    }

    return opportunity;
  });
}

export async function setOpportunityStatus(
  opportunityId: string,
  status: OpportunityStatus,
) {
  const opportunity = await db.salesOpportunity.findUnique({
    where: { id: opportunityId },
    include: { salesOrders: true },
  });
  if (!opportunity) throw new Error("Opportunity tidak ditemukan");
  if (status === OpportunityStatus.LOST && opportunity.salesOrders.length > 0) {
    throw new Error("Opportunity yang sudah memiliki order tidak dapat ditandai LOST");
  }

  return db.salesOpportunity.update({
    where: { id: opportunityId },
    data: { status },
  });
}
