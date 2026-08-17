import { db } from "@/src/lib/db";

async function firstFarmId(): Promise<string | null> {
  const farm = await db.farm.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return farm?.id ?? null;
}

export async function getSalesCustomers() {
  const farmId = await firstFarmId();
  if (!farmId) return [];

  return db.customer.findMany({
    where: { farmId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getSalesLeads() {
  const farmId = await firstFarmId();
  if (!farmId) return [];

  return db.lead.findMany({
    where: { farmId },
    include: { species: true },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function getSalesOrders() {
  const farmId = await firstFarmId();
  if (!farmId) return [];

  return db.salesOrder.findMany({
    where: { farmId },
    include: {
      customer: true,
      items: {
        include: {
          species: true,
          allocations: true,
        },
      },
      invoices: { include: { payments: true } },
    },
    orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getSalesFormOptions() {
  const farmId = await firstFarmId();
  if (!farmId) return { customers: [], species: [] };

  const [customers, species] = await Promise.all([
    db.customer.findMany({
      where: { farmId, active: true },
      select: { id: true, name: true, customerType: true },
      orderBy: { name: "asc" },
    }),
    db.species.findMany({
      where: { active: true },
      select: { id: true, commonName: true },
      orderBy: { commonName: "asc" },
    }),
  ]);

  return { customers, species };
}
