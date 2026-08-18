import {
  AlertSeverity,
  AlertStatus,
  CycleStatus,
  ExpenseSourceType,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import {
  calculateAverageWeightG,
  calculateEstimatedBiomassKg,
  calculateEstimatedPopulation,
  calculateMortalityRatePct,
  calculateSurvivalRatePct,
} from "@/src/domain/kpi/biology";
import {
  calculateAdgGPerDay,
  calculateBiomassGainKg,
  calculateFcr,
  calculateWeightGainG,
} from "@/src/domain/kpi/growth";

export type PondDetailStatus =
  | "ON_TARGET"
  | "MONITOR"
  | "NEEDS_ATTENTION"
  | "COMPLETED";

export interface SamplingTrendPoint {
  id: string;
  sampledAt: Date;
  sampleCount: number;
  averageWeightG: number;
  totalSampleWeightKg: number | null;
  averageLengthCm: number | null;
  weightGainG: number | null;
  adgGPerDay: number | null;
}

export interface PondRecentActivity {
  id: string;
  type: "SAMPLING" | "FEED" | "EXPENSE";
  occurredAt: Date;
  title: string;
  detail: string;
}

export interface PondDetail {
  pondId: string;
  pondCode: string;
  pondName: string | null;
  pondType: string | null;
  dimensions: {
    lengthM: number | null;
    widthM: number | null;
    depthM: number | null;
    volumeM3: number | null;
  };
  farmName: string;
  cycleId: string;
  cycleCode: string;
  cycleStatus: CycleStatus;
  species: string;
  startedAt: Date | null;
  completedAt: Date | null;
  targetHarvestDate: Date | null;
  day: number;
  daysToTargetHarvest: number | null;
  stockedFish: number;
  mortalityFish: number;
  harvestedFishCount: number;
  harvestedBiomassKg: number;
  estimatedPopulation: number;
  populationSource: "OBSERVED" | "ESTIMATED" | "FINAL";
  survivalRatePct: number | null;
  mortalityRatePct: number | null;
  latestAverageWeightG: number | null;
  estimatedBiomassKg: number | null;
  cumulativeFeedKg: number;
  fcr: number | null;
  targetFcr: number | null;
  targetSrPct: number | null;
  targetHarvestWeightKg: number | null;
  targetAverageWeightG: number | null;
  totalCost: number;
  currentCostPerStandingKg: number | null;
  revenueAmount: number;
  actualHppPerKg: number | null;
  netProfit: number | null;
  marginPct: number | null;
  status: PondDetailStatus;
  samplingTrend: SamplingTrendPoint[];
  expenseBreakdown: Array<{ category: string; amount: number }>;
  recentActivity: PondRecentActivity[];
  latestNote: { text: string; occurredAt: Date } | null;
  alerts: Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    recommendedAction: string | null;
    triggeredAt: Date;
  }>;
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function dayOfCycle(startedAt: Date | null, endedAt: Date | null, now: Date): number {
  if (!startedAt) return 0;
  const end = endedAt ?? now;
  return Math.max(1, Math.floor((end.getTime() - startedAt.getTime()) / 86_400_000) + 1);
}

function daysUntil(target: Date | null, now: Date): number | null {
  if (!target) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function determineStatus(input: {
  cycleStatus: CycleStatus;
  fcr: number | null;
  sr: number | null;
  hasWarningAlert: boolean;
  hasActionAlert: boolean;
}): PondDetailStatus {
  if (input.cycleStatus === CycleStatus.COMPLETED) return "COMPLETED";
  if (input.hasActionAlert) return "NEEDS_ATTENTION";
  if (input.hasWarningAlert) return "MONITOR";
  if (input.sr === null || input.fcr === null) return "MONITOR";
  return "ON_TARGET";
}

const includeCycle = {
  pond: { include: { farm: true } },
  species: true,
  stockings: true,
  mortalityLogs: true,
  feedingLogs: true,
  samplingLogs: { orderBy: { sampledAt: "asc" as const } },
  harvests: { orderBy: { harvestedAt: "asc" as const } },
  expenses: true,
  alerts: {
    where: { status: AlertStatus.OPEN },
    orderBy: { triggeredAt: "desc" as const },
  },
} as const;

export async function getPondDetail(
  pondCode: string,
  now = new Date(),
): Promise<PondDetail | null> {
  const normalizedCode = pondCode.trim().toUpperCase();

  const cycle =
    (await db.productionCycle.findFirst({
      where: {
        pond: { code: normalizedCode },
        status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] },
      },
      include: includeCycle,
      orderBy: { createdAt: "desc" },
    })) ??
    (await db.productionCycle.findFirst({
      where: { pond: { code: normalizedCode } },
      include: includeCycle,
      orderBy: { createdAt: "desc" },
    }));

  if (!cycle) return null;

  const isCompleted = cycle.status === CycleStatus.COMPLETED;
  const stockedFish = cycle.stockings.reduce((sum, item) => sum + item.quantity, 0);
  const mortalityFish = cycle.mortalityLogs.reduce((sum, item) => sum + item.quantity, 0);
  const harvestedFishCount = cycle.harvests.reduce(
    (sum, item) => sum + (item.fishCount ?? 0),
    0,
  );
  const allHarvestCountsKnown =
    cycle.harvests.length > 0 && cycle.harvests.every((item) => item.fishCount !== null);

  const samplingTrend: SamplingTrendPoint[] = cycle.samplingLogs.map((sample, index) => {
    const averageWeightG =
      sample.averageWeightG !== null
        ? toNumber(sample.averageWeightG)
        : calculateAverageWeightG(toNumber(sample.totalSampleWeightKg), sample.sampleCount);

    const previous = index > 0 ? cycle.samplingLogs[index - 1] : null;
    let previousAverageWeightG: number | null = null;

    if (previous) {
      previousAverageWeightG =
        previous.averageWeightG !== null
          ? toNumber(previous.averageWeightG)
          : calculateAverageWeightG(
              toNumber(previous.totalSampleWeightKg),
              previous.sampleCount,
            );
    }

    return {
      id: sample.id,
      sampledAt: sample.sampledAt,
      sampleCount: sample.sampleCount,
      averageWeightG,
      totalSampleWeightKg:
        sample.totalSampleWeightKg === null
          ? null
          : toNumber(sample.totalSampleWeightKg),
      averageLengthCm:
        sample.averageLengthCm === null ? null : toNumber(sample.averageLengthCm),
      weightGainG:
        previousAverageWeightG === null
          ? null
          : calculateWeightGainG(averageWeightG, previousAverageWeightG),
      adgGPerDay:
        previousAverageWeightG === null || !previous
          ? null
          : calculateAdgGPerDay(
              averageWeightG,
              previousAverageWeightG,
              sample.sampledAt,
              previous.sampledAt,
            ),
    };
  });

  const latestSample = cycle.samplingLogs.at(-1) ?? null;
  const latestTrend = samplingTrend.at(-1) ?? null;
  const observedPopulation = latestSample?.observedPopulation ?? null;
  const calculatedPopulation = calculateEstimatedPopulation(
    stockedFish,
    mortalityFish,
    harvestedFishCount,
  );
  const estimatedPopulation = isCompleted
    ? 0
    : observedPopulation ?? calculatedPopulation;
  const populationSource: PondDetail["populationSource"] = isCompleted
    ? "FINAL"
    : observedPopulation === null
      ? "ESTIMATED"
      : "OBSERVED";

  const survivalRatePct = isCompleted
    ? allHarvestCountsKnown
      ? calculateSurvivalRatePct(harvestedFishCount, stockedFish)
      : null
    : cycle.harvests.some((item) => item.fishCount === null)
      ? null
      : calculateSurvivalRatePct(
          estimatedPopulation + harvestedFishCount,
          stockedFish,
        );
  const mortalityRatePct = calculateMortalityRatePct(mortalityFish, stockedFish);

  const latestAverageWeightG = latestTrend?.averageWeightG ?? null;
  const estimatedBiomassKg = isCompleted
    ? 0
    : latestAverageWeightG === null
      ? null
      : calculateEstimatedBiomassKg(estimatedPopulation, latestAverageWeightG);

  const initialBiomassKnown =
    cycle.stockings.length > 0 && cycle.stockings.every((item) => item.avgWeightG !== null);
  const initialBiomassKg = initialBiomassKnown
    ? cycle.stockings.reduce(
        (sum, item) => sum + (item.quantity * toNumber(item.avgWeightG)) / 1000,
        0,
      )
    : null;

  const harvestedBiomassKg = cycle.harvests.reduce(
    (sum, item) => sum + toNumber(item.weightKg),
    0,
  );
  const cumulativeFeedKg = cycle.feedingLogs.reduce(
    (sum, item) => sum + toNumber(item.quantityKg),
    0,
  );

  const biomassGainKg =
    initialBiomassKg === null
      ? null
      : isCompleted
        ? harvestedBiomassKg - initialBiomassKg
        : estimatedBiomassKg === null
          ? null
          : calculateBiomassGainKg({
              standingBiomassKg: estimatedBiomassKg,
              harvestedBiomassKg,
              initialBiomassKg,
            });
  const fcr = biomassGainKg === null ? null : calculateFcr(cumulativeFeedKg, biomassGainKg);

  const totalCost = cycle.expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const revenueAmount = cycle.harvests.reduce(
    (sum, harvest) => sum + toNumber(harvest.revenueAmount),
    0,
  );
  const currentCostPerStandingKg =
    !isCompleted && estimatedBiomassKg !== null && estimatedBiomassKg > 0
      ? totalCost / estimatedBiomassKg
      : null;
  const actualHppPerKg =
    isCompleted && harvestedBiomassKg > 0 ? totalCost / harvestedBiomassKg : null;
  const netProfit = isCompleted ? revenueAmount - totalCost : null;
  const marginPct =
    isCompleted && revenueAmount > 0 && netProfit !== null
      ? (netProfit / revenueAmount) * 100
      : null;

  const expenseMap = new Map<string, number>();
  for (const expense of cycle.expenses) {
    expenseMap.set(
      expense.category,
      (expenseMap.get(expense.category) ?? 0) + toNumber(expense.amount),
    );
  }

  const targetFcr = cycle.targetFcr === null ? null : toNumber(cycle.targetFcr);
  const targetSrPct = cycle.targetSrPct === null ? null : toNumber(cycle.targetSrPct);
  const targetHarvestWeightKg =
    cycle.targetHarvestWeightKg === null
      ? null
      : toNumber(cycle.targetHarvestWeightKg);
  const targetAverageWeightG =
    !isCompleted && targetHarvestWeightKg !== null && estimatedPopulation > 0
      ? (targetHarvestWeightKg / estimatedPopulation) * 1000
      : null;
  const hasActionAlert = cycle.alerts.some(
    (alert) => alert.severity === AlertSeverity.ACTION_REQUIRED,
  );
  const hasWarningAlert = cycle.alerts.some(
    (alert) => alert.severity === AlertSeverity.WARNING,
  );

  const recentActivity: PondRecentActivity[] = [
    ...cycle.samplingLogs.map((sample) => ({
      id: `sampling-${sample.id}`,
      type: "SAMPLING" as const,
      occurredAt: sample.sampledAt,
      title: "Sampling dilakukan",
      detail: `${sample.sampleCount} sampel · ${numberForActivity(sample.averageWeightG ?? calculateAverageWeightG(toNumber(sample.totalSampleWeightKg), sample.sampleCount))} g`,
    })),
    ...cycle.feedingLogs.map((feeding) => ({
      id: `feeding-${feeding.id}`,
      type: "FEED" as const,
      occurredAt: feeding.eventAt,
      title: "Pemberian pakan",
      detail: `${numberForActivity(toNumber(feeding.quantityKg))} kg`,
    })),
    ...cycle.expenses
      .filter((expense) => expense.sourceType === ExpenseSourceType.MANUAL)
      .map((expense) => ({
        id: `expense-${expense.id}`,
        type: "EXPENSE" as const,
        occurredAt: expense.expenseDate,
        title: "Input biaya operasional",
        detail: `Rp ${Math.round(toNumber(expense.amount)).toLocaleString("id-ID")}`,
      })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 5);

  const noteSample = cycle.samplingLogs
    .slice()
    .reverse()
    .find((sample) => Boolean(sample.notes?.trim()));
  const latestNote = noteSample?.notes?.trim()
    ? { text: noteSample.notes.trim(), occurredAt: noteSample.sampledAt }
    : null;

  return {
    pondId: cycle.pond.id,
    pondCode: cycle.pond.code,
    pondName: cycle.pond.name,
    pondType: cycle.pond.pondType,
    dimensions: {
      lengthM: cycle.pond.lengthM === null ? null : toNumber(cycle.pond.lengthM),
      widthM: cycle.pond.widthM === null ? null : toNumber(cycle.pond.widthM),
      depthM: cycle.pond.depthM === null ? null : toNumber(cycle.pond.depthM),
      volumeM3: cycle.pond.volumeM3 === null ? null : toNumber(cycle.pond.volumeM3),
    },
    farmName: cycle.pond.farm.name,
    cycleId: cycle.id,
    cycleCode: cycle.cycleCode,
    cycleStatus: cycle.status,
    species: cycle.species.commonName,
    startedAt: cycle.startedAt,
    completedAt: cycle.completedAt,
    targetHarvestDate: cycle.targetHarvestDate,
    day: dayOfCycle(cycle.startedAt, cycle.completedAt, now),
    daysToTargetHarvest: isCompleted ? null : daysUntil(cycle.targetHarvestDate, now),
    stockedFish,
    mortalityFish,
    harvestedFishCount,
    harvestedBiomassKg,
    estimatedPopulation,
    populationSource,
    survivalRatePct,
    mortalityRatePct,
    latestAverageWeightG,
    estimatedBiomassKg,
    cumulativeFeedKg,
    fcr,
    targetFcr,
    targetSrPct,
    targetHarvestWeightKg,
    targetAverageWeightG,
    totalCost,
    currentCostPerStandingKg,
    revenueAmount,
    actualHppPerKg,
    netProfit,
    marginPct,
    status: determineStatus({
      cycleStatus: cycle.status,
      sr: survivalRatePct,
      fcr,
      hasWarningAlert,
      hasActionAlert,
    }),
    samplingTrend,
    expenseBreakdown: [...expenseMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    recentActivity,
    latestNote,
    alerts: cycle.alerts.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      recommendedAction: alert.recommendedAction,
      triggeredAt: alert.triggeredAt,
    })),
  };
}

function numberForActivity(value: unknown): string {
  const number = toNumber(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(number);
}
