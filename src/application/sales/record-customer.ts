import { CustomerType } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordCustomerCommand {
  farmId?: string;
  name: string;
  customerType?: CustomerType;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  addressText?: string;
  notes?: string;
}

export async function recordCustomer(command: RecordCustomerCommand) {
  const name = command.name.trim();
  if (!name) throw new Error("Nama customer wajib diisi");

  const farm = command.farmId
    ? await db.farm.findUnique({ where: { id: command.farmId } })
    : await db.farm.findFirst({ orderBy: { createdAt: "asc" } });

  if (!farm) throw new Error("Farm belum tersedia");

  return db.customer.create({
    data: {
      farmId: farm.id,
      name,
      customerType: command.customerType ?? CustomerType.OTHER,
      contactPerson: command.contactPerson?.trim() || undefined,
      phone: command.phone?.trim() || undefined,
      whatsapp: command.whatsapp?.trim() || undefined,
      email: command.email?.trim() || undefined,
      addressText: command.addressText?.trim() || undefined,
      notes: command.notes?.trim() || undefined,
    },
  });
}
