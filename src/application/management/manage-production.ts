import {
  AllocationType,
  CycleStatus,
  ExpenseCategory,
  ExpenseSourceType,
  PondStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

function optionalPositive(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} harus lebih besar dari 0`);
}

function optionalNonNegative(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} tidak boleh negatif`);
}

export async function getProductionManagementData() {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;

  const [ponds, cycles, species] = await Promise.all([
    db.pond.findMany({
      where: { farmId: farm.id },
      include: { cycles: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { code: "asc" },
    }),
    db.productionCycle.findMany({
      where: { farmId: farm.id },
      include: {
        pond: true,
        species: true,
        stockings: { orderBy: { eventDate: "asc" }, take: 1 },
      },
      orderBy: [{ status: "asc" }, { startedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.species.findMany({ where: { active: true }, orderBy: { commonName: "asc" } }),
  ]);

  return { farm, ponds, cycles, species };
}

export async function createPond(command: {
  code: string;
  name?: string;
  pondType?: string;
  lengthM?: number;
  widthM?: number;
  depthM?: number;
  notes?: string;
}) {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) throw new Error("Farm belum tersedia");

  const code = command.code.trim().toUpperCase();
  if (!code) throw new Error("Kode kolam wajib diisi");
  optionalPositive("Panjang", command.lengthM);
  optionalPositive("Lebar", command.widthM);
  optionalPositive("Kedalaman", command.depthM);

  const volumeM3 = command.lengthM && command.widthM && command.depthM
    ? command.lengthM * command.widthM * command.depthM
    : undefined;

  return db.pond.create({
    data: {
      farmId: farm.id,
      code,
      name: command.name?.trim() || undefined,
      pondType: command.pondType?.trim() || undefined,
      lengthM: command.lengthM,
      widthM: command.widthM,
      depthM: command.depthM,
      volumeM3,
      notes: command.notes?.trim() || undefined,
      status: PondStatus.ACTIVE,
    },
  });
}

export async function updatePond(command: {
  pondId: string;
  name?: string;
  pondType?: string;
  lengthM?: number;
  widthM?: number;
  depthM?: number;
  status: PondStatus;
  notes?: string;
}) {
  optionalPositive("Panjang", command.lengthM);
  optionalPositive("Lebar", command.widthM);
  optionalPositive("Kedalaman", command.depthM);

  const pond = await db.pond.findUnique({ where: { id: command.pondId } });
  if (!pond) throw new Error("Kolam tidak ditemukan");

  if (command.status !== PondStatus.ACTIVE) {
    const activeCycle = await db.productionCycle.findFirst({
      where: { pondId: pond.id, status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] } },
    });
    if (activeCycle) throw new Error("Kolam dengan siklus aktif tidak dapat dinonaktifkan");
  }

  const volumeM3 = command.lengthM && command.widthM && command.depthM
    ? command.lengthM * command.widthM * command.depthM
    : undefined;

  return db.pond.update({
    where: { id: pond.id },
    data: {
      name: command.name?.trim() || null,
      pondType: command.pondType?.trim() || null,
      lengthM: command.lengthM ?? null,
      widthM: command.widthM ?? null,
      depthM: command.depthM ?? null,
      volumeM3: volumeM3 ?? null,
      status: command.status,
      notes: command.notes?.trim() || null,
    },
  });
}

export async function createCycle(command: {
  pondId: string;
  speciesId: string;
  cycleCode: string;
  startedAt: Date;
  targetHarvestDate?: Date;
  targetSrPct?: number;
  targetFcr?: number;
  targetHarvestWeightKg?: number;
  targetHppPerKg?: number;
  targetSellingPricePerKg?: number;
  stockingQuantity: number;
  stockingAvgWeightG?: number;
  seedCostPerUnit?: number;
  supplier?: string;
  notes?: string;
}) {
  if (!command.cycleCode.trim()) throw new Error("Kode siklus wajib diisi");
  if (Number.isNaN(command.startedAt.getTime())) throw new Error("Tanggal mulai tidak valid");
  if (!Number.isInteger(command.stockingQuantity) || command.stockingQuantity <= 0) throw new Error("Jumlah benih harus bilangan bulat positif");
  optionalPositive("Bobot awal", command.stockingAvgWeightG);
  optionalNonNegative("Biaya benih per ekor", command.seedCostPerUnit);
  optionalPositive("Target SR", command.targetSrPct);
  optionalPositive("Target FCR", command.targetFcr);
  optionalPositive("Target panen", command.targetHarvestWeightKg);
  optionalPositive("Target HPP", command.targetHppPerKg);
  optionalPositive("Target harga jual", command.targetSellingPricePerKg);

  return db.$transaction(async (tx) => {
    const pond = await tx.pond.findUnique({ where: { id: command.pondId } });
    if (!pond || pond.status !== PondStatus.ACTIVE) throw new Error("Kolam aktif tidak ditemukan");
    const species = await tx.species.findUnique({ where: { id: command.speciesId } });
    if (!species || !species.active) throw new Error("Species aktif tidak ditemukan");

    const existing = await tx.productionCycle.findFirst({
      where: { pondId: pond.id, status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] } },
    });
    if (existing) throw new Error(`Kolam ${pond.code} masih memiliki siklus aktif ${existing.cycleCode}`);

    const cycle = await tx.productionCycle.create({
      data: {
        farmId: pond.farmId,
        pondId: pond.id,
        speciesId: species.id,
        cycleCode: command.cycleCode.trim().toUpperCase(),
        status: CycleStatus.ACTIVE,
        startedAt: command.startedAt,
        targetHarvestDate: command.targetHarvestDate,
        targetSrPct: command.targetSrPct,
        targetFcr: command.targetFcr,
        targetHarvestWeightKg: command.targetHarvestWeightKg,
        targetHppPerKg: command.targetHppPerKg,
        targetSellingPricePerKg: command.targetSellingPricePerKg,
        notes: command.notes?.trim() || undefined,
      },
    });

    const totalSeedCost = command.seedCostPerUnit === undefined
      ? undefined
      : command.stockingQuantity * command.seedCostPerUnit;

    const stocking = await tx.stocking.create({
      data: {
        cycleId: cycle.id,
        eventDate: command.startedAt,
        quantity: command.stockingQuantity,
        avgWeightG: command.stockingAvgWeightG,
        seedCostPerUnit: command.seedCostPerUnit,
        totalSeedCost,
        supplier: command.supplier?.trim() || undefined,
        notes: command.notes?.trim() || undefined,
      },
    });

    if (totalSeedCost !== undefined && totalSeedCost > 0) {
      await tx.expense.create({
        data: {
          farmId: pond.farmId,
          pondId: pond.id,
          cycleId: cycle.id,
          expenseDate: command.startedAt,
          category: ExpenseCategory.SEED,
          description: `Benih ${command.stockingQuantity} ekor`,
          amount: totalSeedCost,
          allocationType: AllocationType.DIRECT,
          sourceType: ExpenseSourceType.STOCKING,
          sourceId: stocking.id,
        },
      });
    }

    return cycle;
  });
}

export async function updateCycle(command: {
  cycleId: string;
  targetHarvestDate?: Date;
  targetSrPct?: number;
  targetFcr?: number;
  targetHarvestWeightKg?: number;
  targetHppPerKg?: number;
  targetSellingPricePerKg?: number;
  stockingQuantity: number;
  stockingAvgWeightG?: number;
  seedCostPerUnit?: number;
  supplier?: string;
  notes?: string;
}) {
  if (!Number.isInteger(command.stockingQuantity) || command.stockingQuantity <= 0) throw new Error("Jumlah benih harus bilangan bulat positif");
  optionalPositive("Bobot awal", command.stockingAvgWeightG);
  optionalNonNegative("Biaya benih per ekor", command.seedCostPerUnit);
  optionalPositive("Target SR", command.targetSrPct);
  optionalPositive("Target FCR", command.targetFcr);
  optionalPositive("Target panen", command.targetHarvestWeightKg);
  optionalPositive("Target HPP", command.targetHppPerKg);
  optionalPositive("Target harga jual", command.targetSellingPricePerKg);

  return db.$transaction(async (tx) => {
    const cycle = await tx.productionCycle.findUnique({
      where: { id: command.cycleId },
      include: { stockings: { orderBy: { eventDate: "asc" }, take: 1 }, harvests: { select: { id: true }, take: 1 } },
    });
    if (!cycle) throw new Error("Siklus tidak ditemukan");
    if (cycle.status === CycleStatus.COMPLETED || cycle.status === CycleStatus.CANCELLED) throw new Error("Siklus yang sudah selesai tidak dapat diedit");

    const stocking = cycle.stockings[0];
    if (!stocking) throw new Error("Data tebar awal tidak ditemukan");
    if (cycle.harvests.length > 0 && stocking.quantity !== command.stockingQuantity) {
      throw new Error("Jumlah tebar tidak dapat diubah setelah panen tercatat");
    }

    const totalSeedCost = command.seedCostPerUnit === undefined
      ? undefined
      : command.stockingQuantity * command.seedCostPerUnit;

    await tx.stocking.update({
      where: { id: stocking.id },
      data: {
        quantity: command.stockingQuantity,
        avgWeightG: command.stockingAvgWeightG ?? null,
        seedCostPerUnit: command.seedCostPerUnit ?? null,
        totalSeedCost: totalSeedCost ?? null,
        supplier: command.supplier?.trim() || null,
      },
    });

    const seedExpense = await tx.expense.findFirst({
      where: { sourceType: ExpenseSourceType.STOCKING, sourceId: stocking.id },
    });
    if (totalSeedCost !== undefined && totalSeedCost > 0) {
      if (seedExpense) {
        await tx.expense.update({ where: { id: seedExpense.id }, data: { amount: totalSeedCost, description: `Benih ${command.stockingQuantity} ekor` } });
      } else {
        await tx.expense.create({
          data: {
            farmId: cycle.farmId,
            pondId: cycle.pondId,
            cycleId: cycle.id,
            expenseDate: stocking.eventDate,
            category: ExpenseCategory.SEED,
            description: `Benih ${command.stockingQuantity} ekor`,
            amount: totalSeedCost,
            allocationType: AllocationType.DIRECT,
            sourceType: ExpenseSourceType.STOCKING,
            sourceId: stocking.id,
          },
        });
      }
    } else if (seedExpense) {
      await tx.expense.delete({ where: { id: seedExpense.id } });
    }

    return tx.productionCycle.update({
      where: { id: cycle.id },
      data: {
        targetHarvestDate: command.targetHarvestDate ?? null,
        targetSrPct: command.targetSrPct ?? null,
        targetFcr: command.targetFcr ?? null,
        targetHarvestWeightKg: command.targetHarvestWeightKg ?? null,
        targetHppPerKg: command.targetHppPerKg ?? null,
        targetSellingPricePerKg: command.targetSellingPricePerKg ?? null,
        notes: command.notes?.trim() || null,
      },
    });
  });
}
