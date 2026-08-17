import { LeadStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordLeadCommand {
  farmId?: string;
  speciesId?: string;
  title: string;
  source?: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  expectedDemandKg?: number;
  expectedPricePerKg?: number;
  nextFollowUpAt?: Date;
  notes?: string;
}

function optionalPositive(name: string, value?: number): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus lebih besar dari 0`);
  }
}

export async function recordLead(command: RecordLeadCommand) {
  const title = command.title.trim();
  if (!title) throw new Error("Judul lead wajib diisi");

  optionalPositive("Potensi kebutuhan", command.expectedDemandKg);
  optionalPositive("Potensi harga", command.expectedPricePerKg);

  if (
    command.nextFollowUpAt &&
    Number.isNaN(command.nextFollowUpAt.getTime())
  ) {
    throw new Error("Tanggal follow-up tidak valid");
  }

  const farm = command.farmId
    ? await db.farm.findUnique({ where: { id: command.farmId } })
    : await db.farm.findFirst({ orderBy: { createdAt: "asc" } });

  if (!farm) throw new Error("Farm belum tersedia");

  if (command.speciesId) {
    const species = await db.species.findUnique({ where: { id: command.speciesId } });
    if (!species) throw new Error("Species tidak ditemukan");
  }

  return db.lead.create({
    data: {
      farmId: farm.id,
      speciesId: command.speciesId,
      title,
      status: LeadStatus.NEW,
      source: command.source?.trim() || undefined,
      contactName: command.contactName?.trim() || undefined,
      phone: command.phone?.trim() || undefined,
      whatsapp: command.whatsapp?.trim() || undefined,
      email: command.email?.trim() || undefined,
      expectedDemandKg: command.expectedDemandKg,
      expectedPricePerKg: command.expectedPricePerKg,
      nextFollowUpAt: command.nextFollowUpAt,
      notes: command.notes?.trim() || undefined,
    },
  });
}
