import { CycleStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface ActiveCycleOption {
  id: string;
  label: string;
  pondCode: string;
  species: string;
}

export async function getActiveCycleOptions(): Promise<ActiveCycleOption[]> {
  const cycles = await db.productionCycle.findMany({
    where: { status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] } },
    include: { pond: true, species: true },
    orderBy: [{ farmId: "asc" }, { createdAt: "asc" }],
  });

  return cycles.map((cycle) => ({
    id: cycle.id,
    pondCode: cycle.pond.code,
    species: cycle.species.commonName,
    label: `${cycle.pond.code} — ${cycle.species.commonName}`,
  }));
}
