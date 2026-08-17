import { AlertSeverity, AlertStatus, CycleStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import {
  calculateAverageWeightG,
  calculateEstimatedBiomassKg,
  calculateEstimatedPopulation,
  calculateMortalityRatePct,
  calculateSurvivalRatePct,
} from "@/src/domain/kpi/biology";

export type PondHealthStatus = "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION";

export interface DashboardCycleRow {
  cycleId: string;
  pondCode: string;
  species: string;
  day: number;
  stockedFish: number;
  estimatedPopulation: number;
  populationIsEstimated: boolean;
  survivalRatePct: number | null;
  mortalityRatePct: number | null;
  averageWeightG: number | null;
  estimatedBiomassKg: number | null;
  cumulativeFeedKg: number;
  fcr: number | null;
  totalCost: number;
  currentCostPerStandingKg: number | null;
  targetFcr: number | null;
  targetSrPct: number | null;
  status: PondHealthStatus;
  openAlertCount: number;
}

export interface DashboardOverview {
  farmId: string;
  farmName: string;
  ownerName: string | null;
  activePonds: number;
  activeFish: number;
  estimatedBiomassKg: number;
  runningCost: number;
  survivalRatePct: number | null;
  mortalityRatePct: number | null;
  fcr: number | null;
  cycles: DashboardCycleRow[];
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function dayOfCycle(startedAt: Date | null, now: Date): number {
  if (!startedAt) return 0;
  const elapsed = now.getTime() - startedAt.getTime();
  return Math.max(1, Math.floor(elapsed / 86_400_000) + 1);
}

function determineStatus(input: {
  sr: number | null;
  targetSr: number | null;
  fcr: number | null;
  targetFcr: number | null;
  hasActionAlert: boolean;
}): PondHealthStatus {
  if (input.hasActionAlert) return "NEEDS_ATTENTION";

  if (
    (input.sr !== null && input.targetSr !== null && input.sr < input.targetSr) ||
    (input.fcr !== null && input.targetFcr !== null && input.fcr > input.targetFcr)
  ) {
    return "NEEDS_ATTENTION";
  }

  if (input.sr === null || input.fcr === null) return "MONITOR";
  return "ON_TARGET";
}

export async function getDashboardOverview(
  farmId?: string,
  now = new Date(),
): Promise<DashboardOverview | null> {
  const farm = farmId
    ? await db.farm.findUnique({
        where: { id: farmId },
        include: {
          memberships: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      })
    : await db.farm.findFirst({
        orderBy: { createdAt: "asc" },
        include: {
          memberships: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

  if (!farm) return null;

  const cycles = await db.productionCycle.findMany({
    where: {
      farmId: farm.id,
      status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] },
    },
    include: {
      pond: true,
      species: true,
      stockings: true,
      mortalityLogs: true,
      feedingLogs: true,
      samplingLogs: { orderBy: { sampledAt: "desc" } },
      harvests: true,
      expenses: true,
      alerts: { where: { status: AlertStatus.OPEN } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: DashboardCycleRow[] = cycles.map((cycle) => {
    const stockedFish = cycle.stockings.reduce((sum, item) => sum + item.quantity, 0);
    const mortality = cycle.mortalityLogs.reduce((sum, item) => sum + item.quantity, 0);
    const harvestedFishCount = cycle.harvests.reduce(
      (sum, item) => sum + (item.fishCount ?? 0),
      0,
    );
    const hasHarvestWithoutCount = cycle.harvests.some((item) => item.fishCount === null);

    const estimatedPopulation = calculateEstimatedPopulation(
      stockedFish,
      mortality,
      harvestedFishCount,
    );
    const survivalRatePct = calculateSurvivalRatePct(
      estimatedPopulation + harvestedFishCount,
      stockedFish,
    );
    const mortalityRatePct = calculateMortalityRatePct(mortality, stockedFish);

    const latestSample = cycle.samplingLogs[0];
    let averageWeightG: number | null = null;
    if (latestSample?.averageWeightG !== null && latestSample?.averageWeightG !== undefined) {
      averageWeightG = toNumber(latestSample.averageWeightG);
    } else if (latestSample?.totalSampleWeightKg && latestSample.sampleCount > 0) {
      averageWeightG = calculateAverageWeightG(
        toNumber(latestSample.totalSampleWeightKg),
        latestSample.sampleCount,
      );
    }

    const estimatedBiomassKg =
      averageWeightG === null
        ? null
        : calculateEstimatedBiomassKg(estimatedPopulation, averageWeightG);

    const initialBiomassKg = cycle.stockings.reduce((sum, item) => {
      if (item.avgWeightG === null) return sum;
      return sum + (item.quantity * toNumber(item.avgWeightG)) / 1000;
    }, 0);

    const harvestedBiomassKg = cycle.harvests.reduce(
      (sum, item) => sum + toNumber(item.weightKg),
      0,
    );
    const cumulativeFeedKg = cycle.feedingLogs.reduce(
      (sum, item) => sum + toNumber(item.quantityKg),
      0,
    );

    const adjustedBiomassGain =
      estimatedBiomassKg === null
        ? null
        : estimatedBiomassKg + harvestedBiomassKg - initialBiomassKg;
    const fcr =
      adjustedBiomassGain !== null && adjustedBiomassGain > 0
        ? cumulativeFeedKg / adjustedBiomassGain
        : null;

    const totalCost = cycle.expenses.reduce(
      (sum, item) => sum + toNumber(item.amount),
      0,
    );
    const currentCostPerStandingKg =
      estimatedBiomassKg !== null && estimatedBiomassKg > 0
        ? totalCost / estimatedBiomassKg
        : null;

    const targetFcr = cycle.targetFcr === null ? null : toNumber(cycle.targetFcr);
    const targetSrPct =
      cycle.targetSrPct === null ? null : toNumber(cycle.targetSrPct);
    const hasActionAlert = cycle.alerts.some(
      (alert) => alert.severity === AlertSeverity.ACTION_REQUIRED,
    );

    return {
      cycleId: cycle.id,
      pondCode: cycle.pond.code,
      species: cycle.species.commonName,
      day: dayOfCycle(cycle.startedAt, now),
      stockedFish,
      estimatedPopulation,
      populationIsEstimated: hasHarvestWithoutCount,
      survivalRatePct,
      mortalityRatePct,
      averageWeightG,
      estimatedBiomassKg,
      cumulativeFeedKg,
      fcr,
      totalCost,
      currentCostPerStandingKg,
      targetFcr,
      targetSrPct,
      status: determineStatus({
        sr: survivalRatePct,
        targetSr: targetSrPct,
        fcr,
        targetFcr,
        hasActionAlert,
      }),
      openAlertCount: cycle.alerts.length,
    };
  });

  const totalStocked = rows.reduce((sum, row) => sum + row.stockedFish, 0);
  const activeFish = rows.reduce((sum, row) => sum + row.estimatedPopulation, 0);
  const estimatedBiomassKg = rows.reduce(
    (sum, row) => sum + (row.estimatedBiomassKg ?? 0),
    0,
  );
  const runningCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const totalMortality = cycles.reduce(
    (sum, cycle) =>
      sum + cycle.mortalityLogs.reduce((inner, item) => inner + item.quantity, 0),
    0,
  );
  const totalFeed = rows.reduce((sum, row) => sum + row.cumulativeFeedKg, 0);
  const totalInitialBiomass = cycles.reduce(
    (sum, cycle) =>
      sum +
      cycle.stockings.reduce(
        (inner, item) =>
          inner +
          (item.avgWeightG === null
            ? 0
            : (item.quantity * toNumber(item.avgWeightG)) / 1000),
        0,
      ),
    0,
  );
  const totalHarvestedBiomass = cycles.reduce(
    (sum, cycle) =>
      sum + cycle.harvests.reduce((inner, item) => inner + toNumber(item.weightKg), 0),
    0,
  );
  const farmBiomassGain =
    estimatedBiomassKg + totalHarvestedBiomass - totalInitialBiomass;

  return {
    farmId: farm.id,
    farmName: farm.name,
    ownerName: farm.memberships[0]?.user.name ?? null,
    activePonds: rows.length,
    activeFish,
    estimatedBiomassKg,
    runningCost,
    survivalRatePct:
      totalStocked > 0 ? ((totalStocked - totalMortality) / totalStocked) * 100 : null,
    mortalityRatePct:
      totalStocked > 0 ? (totalMortality / totalStocked) * 100 : null,
    fcr: farmBiomassGain > 0 ? totalFeed / farmBiomassGain : null,
    cycles: rows,
  };
}
