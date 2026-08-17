import {
  AllocationType,
  CycleStatus,
  ExpenseCategory,
  ExpenseSourceType,
  HarvestType,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { calculateFcr } from "@/src/domain/kpi/growth";

export interface RecordHarvestCommand {
  cycleId: string;
  harvestedAt: Date;
  harvestType: HarvestType;
  fishCount?: number;
  weightKg: number;
  sellingPricePerKg: number;
  buyerName?: string;
  harvestCost?: number;
  notes?: string;
  createdById?: string;
}

export interface RecordHarvestResult {
  harvestId: string;
  harvestLotId: string;
  harvestLotCode: string;
  pondCode: string;
  cycleStatus: CycleStatus;
  cumulativeHarvestWeightKg: number;
  cumulativeRevenue: number;
  totalCost: number;
  actualHppPerKg: number | null;
  netProfit: number | null;
  marginPct: number | null;
  finalFcr: number | null;
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus lebih besar dari 0`);
  }
}

export async function recordHarvest(
  command: RecordHarvestCommand,
): Promise<RecordHarvestResult> {
  assertPositive("Berat panen", command.weightKg);
  assertPositive("Harga jual", command.sellingPricePerKg);

  const harvestCost = command.harvestCost ?? 0;
  if (!Number.isFinite(harvestCost) || harvestCost < 0) {
    throw new Error("Biaya panen tidak boleh negatif");
  }

  if (
    command.fishCount !== undefined &&
    (!Number.isInteger(command.fishCount) || command.fishCount <= 0)
  ) {
    throw new Error("Jumlah ikan panen harus berupa bilangan bulat positif");
  }

  if (Number.isNaN(command.harvestedAt.getTime())) {
    throw new Error("Tanggal panen tidak valid");
  }

  return db.$transaction(async (tx) => {
    const cycle = await tx.productionCycle.findUnique({
      where: { id: command.cycleId },
      include: {
        pond: { select: { code: true } },
        stockings: true,
        mortalityLogs: true,
        feedingLogs: true,
        harvests: true,
        expenses: true,
      },
    });

    if (!cycle) throw new Error("Siklus budidaya tidak ditemukan");
    if (![CycleStatus.ACTIVE, CycleStatus.HARVESTING].includes(cycle.status)) {
      throw new Error("Panen hanya dapat dicatat pada siklus aktif atau harvesting");
    }

    if (cycle.harvests.some((harvest) => harvest.harvestType === HarvestType.FINAL)) {
      throw new Error("Siklus ini sudah memiliki panen final");
    }

    const stockedFish = cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
    const mortalityFish = cycle.mortalityLogs.reduce((sum, row) => sum + row.quantity, 0);
    const knownHarvestedFish = cycle.harvests.reduce(
      (sum, row) => sum + (row.fishCount ?? 0),
      0,
    );
    const approximateLiveFish = Math.max(
      stockedFish - mortalityFish - knownHarvestedFish,
      0,
    );

    if (command.fishCount !== undefined && command.fishCount > approximateLiveFish) {
      throw new Error(
        `Jumlah ikan panen ${command.fishCount} melebihi estimasi populasi hidup ${approximateLiveFish}`,
      );
    }

    const revenueAmount = command.weightKg * command.sellingPricePerKg;

    const harvest = await tx.harvest.create({
      data: {
        cycleId: cycle.id,
        harvestedAt: command.harvestedAt,
        harvestType: command.harvestType,
        fishCount: command.fishCount,
        weightKg: command.weightKg,
        sellingPricePerKg: command.sellingPricePerKg,
        revenueAmount,
        buyerName: command.buyerName?.trim() || undefined,
        notes: command.notes?.trim() || undefined,
        createdById: command.createdById,
      },
    });

    const lotSequence = cycle.harvests.length + 1;
    const harvestLotCode = `HL-${cycle.cycleCode}-${String(lotSequence).padStart(2, "0")}`;
    const harvestLot = await tx.harvestLot.create({
      data: {
        farmId: cycle.farmId,
        harvestId: harvest.id,
        speciesId: cycle.speciesId,
        lotCode: harvestLotCode,
        quantityKg: command.weightKg,
        notes: `Generated from ${command.harvestType.toLowerCase()} harvest ${cycle.pond.code}`,
      },
    });

    if (harvestCost > 0) {
      await tx.expense.create({
        data: {
          farmId: cycle.farmId,
          pondId: cycle.pondId,
          cycleId: cycle.id,
          expenseDate: command.harvestedAt,
          category: ExpenseCategory.HARVEST,
          description: `Biaya panen ${command.harvestType === HarvestType.FINAL ? "final" : "parsial"}`,
          amount: harvestCost,
          allocationType: AllocationType.DIRECT,
          sourceType: ExpenseSourceType.HARVEST,
          sourceId: harvest.id,
          createdById: command.createdById,
        },
      });
    }

    const cycleStatus =
      command.harvestType === HarvestType.FINAL
        ? CycleStatus.COMPLETED
        : CycleStatus.HARVESTING;

    await tx.productionCycle.update({
      where: { id: cycle.id },
      data: {
        status: cycleStatus,
        completedAt:
          command.harvestType === HarvestType.FINAL
            ? command.harvestedAt
            : undefined,
      },
    });

    const cumulativeHarvestWeightKg =
      cycle.harvests.reduce((sum, row) => sum + Number(row.weightKg), 0) +
      command.weightKg;
    const cumulativeRevenue =
      cycle.harvests.reduce((sum, row) => sum + Number(row.revenueAmount), 0) +
      revenueAmount;
    const totalCost =
      cycle.expenses.reduce((sum, row) => sum + Number(row.amount), 0) +
      harvestCost;

    const isFinal = command.harvestType === HarvestType.FINAL;
    const actualHppPerKg =
      isFinal && cumulativeHarvestWeightKg > 0
        ? totalCost / cumulativeHarvestWeightKg
        : null;
    const netProfit = isFinal ? cumulativeRevenue - totalCost : null;
    const marginPct =
      isFinal && cumulativeRevenue > 0 && netProfit !== null
        ? (netProfit / cumulativeRevenue) * 100
        : null;

    const initialBiomassKnown =
      cycle.stockings.length > 0 &&
      cycle.stockings.every((row) => row.avgWeightG !== null);
    const initialBiomassKg = initialBiomassKnown
      ? cycle.stockings.reduce(
          (sum, row) => sum + (row.quantity * Number(row.avgWeightG)) / 1000,
          0,
        )
      : null;
    const cumulativeFeedKg = cycle.feedingLogs.reduce(
      (sum, row) => sum + Number(row.quantityKg),
      0,
    );
    const finalBiomassGainKg =
      isFinal && initialBiomassKg !== null
        ? cumulativeHarvestWeightKg - initialBiomassKg
        : null;
    const finalFcr =
      finalBiomassGainKg === null
        ? null
        : calculateFcr(cumulativeFeedKg, finalBiomassGainKg);

    return {
      harvestId: harvest.id,
      harvestLotId: harvestLot.id,
      harvestLotCode,
      pondCode: cycle.pond.code,
      cycleStatus,
      cumulativeHarvestWeightKg,
      cumulativeRevenue,
      totalCost,
      actualHppPerKg,
      netProfit,
      marginPct,
      finalFcr,
    };
  });
}
