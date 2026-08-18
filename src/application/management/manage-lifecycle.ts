import { CycleStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export async function deleteEmptyPond(pondId: string) {
  const pond = await db.pond.findUnique({
    where: { id: pondId },
    include: { cycles: { select: { id: true }, take: 1 }, expenses: { select: { id: true }, take: 1 } },
  });
  if (!pond) throw new Error("Kolam tidak ditemukan");
  if (pond.cycles.length > 0 || pond.expenses.length > 0) {
    throw new Error("Kolam yang sudah memiliki histori tidak boleh dihapus. Gunakan status INACTIVE setelah siklus selesai.");
  }
  await db.pond.delete({ where: { id: pond.id } });
}

export async function cancelCycle(cycleId: string) {
  const cycle = await db.productionCycle.findUnique({
    where: { id: cycleId },
    include: { harvests: { select: { id: true }, take: 1 } },
  });
  if (!cycle) throw new Error("Siklus tidak ditemukan");
  if (cycle.status === CycleStatus.COMPLETED || cycle.status === CycleStatus.CANCELLED) {
    throw new Error("Siklus sudah ditutup");
  }
  if (cycle.harvests.length > 0) {
    throw new Error("Siklus yang sudah memiliki panen tidak boleh dibatalkan. Tutup melalui Panen Final.");
  }
  await db.productionCycle.update({
    where: { id: cycle.id },
    data: { status: CycleStatus.CANCELLED, completedAt: new Date() },
  });
  await db.alert.updateMany({
    where: { cycleId: cycle.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
}
