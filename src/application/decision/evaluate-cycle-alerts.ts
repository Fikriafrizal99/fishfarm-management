import {
  AlertStatus,
  CycleStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import {
  calculateAverageWeightG,
  calculateEstimatedBiomassKg,
  calculateEstimatedPopulation,
  calculateSurvivalRatePct,
} from "@/src/domain/kpi/biology";
import {
  calculateBiomassGainKg,
  calculateFcr,
} from "@/src/domain/kpi/growth";
import {
  evaluateCycleRules,
  type RuleEvaluation,
} from "@/src/domain/decision/evaluate-cycle-rules";
import { DEFAULT_DECISION_ENGINE_CONFIG } from "@/src/domain/decision/config";

export interface EvaluateCycleAlertsResult {
  cycleId: string;
  opened: number;
  updated: number;
  resolved: number;
  activeRuleCodes: string[];
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export async function evaluateCycleAlerts(
  cycleId: string,
  now = new Date(),
): Promise<EvaluateCycleAlertsResult> {
  const cycle = await db.productionCycle.findUnique({
    where: { id: cycleId },
    include: {
      stockings: true,
      mortalityLogs: true,
      feedingLogs: true,
      harvests: true,
      samplingLogs: {
        orderBy: { sampledAt: "desc" },
        take: 1,
      },
    },
  });

  if (!cycle) throw new Error("Siklus budidaya tidak ditemukan untuk evaluasi alert");

  const stockedFish = cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
  const mortalityFish = cycle.mortalityLogs.reduce((sum, row) => sum + row.quantity, 0);
  const harvestedFishCount = cycle.harvests.reduce(
    (sum, row) => sum + (row.fishCount ?? 0),
    0,
  );
  const hasHarvestWithoutCount = cycle.harvests.some((row) => row.fishCount === null);

  const estimatedPopulation = calculateEstimatedPopulation(
    stockedFish,
    mortalityFish,
    harvestedFishCount,
  );

  const survivalRatePct =
    hasHarvestWithoutCount
      ? null
      : cycle.status === CycleStatus.COMPLETED
        ? cycle.harvests.length > 0
          ? calculateSurvivalRatePct(harvestedFishCount, stockedFish)
          : null
        : calculateSurvivalRatePct(
            estimatedPopulation + harvestedFishCount,
            stockedFish,
          );

  const latestSample = cycle.samplingLogs[0] ?? null;
  const latestAverageWeightG = latestSample
    ? latestSample.averageWeightG !== null
      ? toNumber(latestSample.averageWeightG)
      : latestSample.totalSampleWeightKg !== null
        ? calculateAverageWeightG(
            toNumber(latestSample.totalSampleWeightKg),
            latestSample.sampleCount,
          )
        : null
    : null;

  const standingBiomassKg =
    cycle.status === CycleStatus.COMPLETED
      ? 0
      : latestAverageWeightG === null
        ? null
        : calculateEstimatedBiomassKg(
            estimatedPopulation,
            latestAverageWeightG,
          );

  const initialBiomassKnown =
    cycle.stockings.length > 0 &&
    cycle.stockings.every((row) => row.avgWeightG !== null);
  const initialBiomassKg = initialBiomassKnown
    ? cycle.stockings.reduce(
        (sum, row) => sum + (row.quantity * toNumber(row.avgWeightG)) / 1000,
        0,
      )
    : null;
  const harvestedBiomassKg = cycle.harvests.reduce(
    (sum, row) => sum + toNumber(row.weightKg),
    0,
  );
  const cumulativeFeedKg = cycle.feedingLogs.reduce(
    (sum, row) => sum + toNumber(row.quantityKg),
    0,
  );

  const biomassGainKg =
    initialBiomassKg === null
      ? null
      : cycle.status === CycleStatus.COMPLETED
        ? harvestedBiomassKg - initialBiomassKg
        : standingBiomassKg === null
          ? null
          : calculateBiomassGainKg({
              standingBiomassKg,
              harvestedBiomassKg,
              initialBiomassKg,
            });
  const fcr = biomassGainKg === null ? null : calculateFcr(cumulativeFeedKg, biomassGainKg);

  const evaluations = evaluateCycleRules({
    cycleStatus: cycle.status,
    startedAt: cycle.startedAt,
    latestSamplingAt: latestSample?.sampledAt ?? null,
    initialBiomassKnown,
    fcr,
    targetFcr: cycle.targetFcr === null ? null : toNumber(cycle.targetFcr),
    survivalRatePct,
    targetSrPct: cycle.targetSrPct === null ? null : toNumber(cycle.targetSrPct),
    targetHarvestDate: cycle.targetHarvestDate,
    now,
  });

  const ruleCodes = evaluations.map((evaluation) => evaluation.ruleCode);
  const existingAlerts = await db.alert.findMany({
    where: {
      cycleId,
      ruleCode: { in: ruleCodes },
      status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
    },
    orderBy: { triggeredAt: "asc" },
  });

  let opened = 0;
  let updated = 0;
  let resolved = 0;

  for (const evaluation of evaluations) {
    const matches = existingAlerts.filter(
      (alert) => alert.ruleCode === evaluation.ruleCode,
    );
    const existing = matches[0] ?? null;

    if (evaluation.active) {
      if (existing) {
        await db.alert.update({
          where: { id: existing.id },
          data: {
            severity: evaluation.severity,
            title: evaluation.title,
            message: evaluation.message,
            metricName: evaluation.metricName,
            metricValue: evaluation.metricValue,
            thresholdValue: evaluation.thresholdValue,
            recommendedAction: evaluation.recommendedAction,
            metadata: evaluation.metadata,
            ruleVersion: DEFAULT_DECISION_ENGINE_CONFIG.ruleVersion,
            resolvedAt: null,
          },
        });
        updated += 1;

        for (const duplicate of matches.slice(1)) {
          await db.alert.update({
            where: { id: duplicate.id },
            data: { status: AlertStatus.RESOLVED, resolvedAt: now },
          });
          resolved += 1;
        }
      } else {
        await db.alert.create({
          data: {
            cycleId,
            ruleCode: evaluation.ruleCode,
            severity: evaluation.severity,
            status: AlertStatus.OPEN,
            title: evaluation.title,
            message: evaluation.message,
            metricName: evaluation.metricName,
            metricValue: evaluation.metricValue,
            thresholdValue: evaluation.thresholdValue,
            recommendedAction: evaluation.recommendedAction,
            metadata: evaluation.metadata,
            triggeredAt: now,
            ruleVersion: DEFAULT_DECISION_ENGINE_CONFIG.ruleVersion,
          },
        });
        opened += 1;
      }
    } else {
      for (const alert of matches) {
        await db.alert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.RESOLVED,
            resolvedAt: now,
          },
        });
        resolved += 1;
      }
    }
  }

  return {
    cycleId,
    opened,
    updated,
    resolved,
    activeRuleCodes: evaluations
      .filter((evaluation: RuleEvaluation) => evaluation.active)
      .map((evaluation) => evaluation.ruleCode),
  };
}
