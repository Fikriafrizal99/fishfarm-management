import {
  AllocationType,
  CycleStatus,
  ExpenseCategory,
  ExpenseSourceType,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface RecordDailyInputCommand {
  cycleId: string;
  eventAt: Date;
  feedKg?: number;
  mortalityQty?: number;
  additionalExpenseAmount?: number;
  additionalExpenseCategory?: ExpenseCategory;
  notes?: string;
  createdById?: string;
}

export interface RecordDailyInputResult {
  feedingLogId: string | null;
  mortalityLogId: string | null;
  additionalExpenseId: string | null;
}

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} tidak boleh negatif`);
  }
}

export async function recordDailyInput(
  command: RecordDailyInputCommand,
): Promise<RecordDailyInputResult> {
  const feedKg = command.feedKg ?? 0;
  const mortalityQty = command.mortalityQty ?? 0;
  const additionalExpenseAmount = command.additionalExpenseAmount ?? 0;

  assertNonNegative("Pakan", feedKg);
  assertNonNegative("Mortalitas", mortalityQty);
  assertNonNegative("Biaya tambahan", additionalExpenseAmount);

  if (!Number.isInteger(mortalityQty)) {
    throw new Error("Jumlah ikan mati harus berupa bilangan bulat");
  }

  if (feedKg === 0 && mortalityQty === 0 && additionalExpenseAmount === 0) {
    throw new Error("Minimal satu data harian harus diisi");
  }

  if (Number.isNaN(command.eventAt.getTime())) {
    throw new Error("Tanggal input tidak valid");
  }

  return db.$transaction(async (tx) => {
    const cycle = await tx.productionCycle.findUnique({
      where: { id: command.cycleId },
      include: {
        stockings: { select: { quantity: true } },
        mortalityLogs: { select: { quantity: true } },
        harvests: { select: { fishCount: true } },
      },
    });

    if (!cycle) throw new Error("Siklus budidaya tidak ditemukan");
    if (
      cycle.status !== CycleStatus.ACTIVE &&
      cycle.status !== CycleStatus.HARVESTING
    ) {
      throw new Error("Input harian hanya dapat dicatat pada siklus aktif");
    }

    const stocked = cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
    const previousMortality = cycle.mortalityLogs.reduce(
      (sum, row) => sum + row.quantity,
      0,
    );
    const harvestedCount = cycle.harvests.reduce(
      (sum, row) => sum + (row.fishCount ?? 0),
      0,
    );
    const approximateLivePopulation = Math.max(
      stocked - previousMortality - harvestedCount,
      0,
    );

    if (mortalityQty > approximateLivePopulation) {
      throw new Error(
        `Mortalitas ${mortalityQty} ekor melebihi estimasi populasi hidup ${approximateLivePopulation} ekor`,
      );
    }

    let feedingLogId: string | null = null;
    let mortalityLogId: string | null = null;
    let additionalExpenseId: string | null = null;

    if (feedKg > 0) {
      const feedType = await tx.feedType.findFirst({
        where: { farmId: cycle.farmId, active: true },
        orderBy: { createdAt: "asc" },
      });

      const feeding = await tx.feedingLog.create({
        data: {
          cycleId: cycle.id,
          feedTypeId: feedType?.id,
          eventAt: command.eventAt,
          quantityKg: feedKg,
          unitCostPerKg: feedType?.defaultUnitCost,
          notes: command.notes?.trim() || undefined,
          createdById: command.createdById,
        },
      });
      feedingLogId = feeding.id;

      if (feedType?.defaultUnitCost !== null && feedType?.defaultUnitCost !== undefined) {
        const unitCost = Number(feedType.defaultUnitCost);
        const feedCost = feedKg * unitCost;
        await tx.expense.create({
          data: {
            farmId: cycle.farmId,
            pondId: cycle.pondId,
            cycleId: cycle.id,
            expenseDate: command.eventAt,
            category: ExpenseCategory.FEED,
            description: `Pakan ${feedKg} kg`,
            amount: feedCost,
            allocationType: AllocationType.DIRECT,
            sourceType: ExpenseSourceType.FEEDING,
            sourceId: feeding.id,
            createdById: command.createdById,
          },
        });
      }
    }

    if (mortalityQty > 0) {
      const mortality = await tx.mortalityLog.create({
        data: {
          cycleId: cycle.id,
          eventAt: command.eventAt,
          quantity: mortalityQty,
          notes: command.notes?.trim() || undefined,
          createdById: command.createdById,
        },
      });
      mortalityLogId = mortality.id;
    }

    if (additionalExpenseAmount > 0) {
      const expense = await tx.expense.create({
        data: {
          farmId: cycle.farmId,
          pondId: cycle.pondId,
          cycleId: cycle.id,
          expenseDate: command.eventAt,
          category: command.additionalExpenseCategory ?? ExpenseCategory.OTHER,
          description: command.notes?.trim() || "Biaya operasional harian",
          amount: additionalExpenseAmount,
          allocationType: AllocationType.DIRECT,
          sourceType: ExpenseSourceType.MANUAL,
          createdById: command.createdById,
        },
      });
      additionalExpenseId = expense.id;
    }

    return { feedingLogId, mortalityLogId, additionalExpenseId };
  });
}
