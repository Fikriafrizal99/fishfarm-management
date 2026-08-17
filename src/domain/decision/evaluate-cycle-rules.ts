import { AlertSeverity, CycleStatus } from "@/src/generated/prisma/client";
import {
  DEFAULT_DECISION_ENGINE_CONFIG,
  type DecisionEngineConfig,
} from "./config";

export interface CycleRuleInput {
  cycleStatus: CycleStatus;
  startedAt: Date | null;
  latestSamplingAt: Date | null;
  initialBiomassKnown: boolean;
  fcr: number | null;
  targetFcr: number | null;
  survivalRatePct: number | null;
  targetSrPct: number | null;
  targetHarvestDate: Date | null;
  now: Date;
}

export interface RuleEvaluation {
  ruleCode: string;
  active: boolean;
  severity: AlertSeverity;
  title: string;
  message: string;
  metricName: string | null;
  metricValue: number | null;
  thresholdValue: number | null;
  recommendedAction: string | null;
  metadata?: Record<string, number | string | boolean | null>;
}

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 86_400_000;
}

export function evaluateCycleRules(
  input: CycleRuleInput,
  config: DecisionEngineConfig = DEFAULT_DECISION_ENGINE_CONFIG,
): RuleEvaluation[] {
  const activeCycle =
    input.cycleStatus === CycleStatus.ACTIVE ||
    input.cycleStatus === CycleStatus.HARVESTING;

  if (!activeCycle) {
    return [
      "DQ_SAMPLING_STALE",
      "DQ_INITIAL_BIOMASS_MISSING",
      "FCR_ABOVE_TARGET",
      "SR_BELOW_TARGET",
      "HARVEST_DATE_NEAR",
    ].map((ruleCode) => ({
      ruleCode,
      active: false,
      severity: AlertSeverity.INFO,
      title: "Rule inactive",
      message: "Siklus tidak aktif.",
      metricName: null,
      metricValue: null,
      thresholdValue: null,
      recommendedAction: null,
    }));
  }

  const samplingAgeDays = input.latestSamplingAt
    ? daysBetween(input.now, input.latestSamplingAt)
    : input.startedAt
      ? daysBetween(input.now, input.startedAt)
      : 0;
  const samplingStale = samplingAgeDays > config.samplingMaxAgeDays;

  const samplingRule: RuleEvaluation = {
    ruleCode: "DQ_SAMPLING_STALE",
    active: samplingStale,
    severity: AlertSeverity.WARNING,
    title: input.latestSamplingAt ? "Sampling perlu diperbarui" : "Belum ada sampling terbaru",
    message: input.latestSamplingAt
      ? `Sampling terakhir sekitar ${Math.floor(samplingAgeDays)} hari lalu. Estimasi biomassa dan FCR dapat memakai data bobot yang sudah lama.`
      : `Siklus sudah berjalan sekitar ${Math.floor(samplingAgeDays)} hari tanpa sampling yang dapat dipakai untuk estimasi biomassa.`,
    metricName: "sampling_age_days",
    metricValue: samplingAgeDays,
    thresholdValue: config.samplingMaxAgeDays,
    recommendedAction: "Lakukan sampling ulang sebelum mengambil keputusan yang bergantung pada biomassa atau FCR.",
  };

  const initialBiomassRule: RuleEvaluation = {
    ruleCode: "DQ_INITIAL_BIOMASS_MISSING",
    active: !input.initialBiomassKnown,
    severity: AlertSeverity.INFO,
    title: "Biomassa awal belum lengkap",
    message: "Bobot awal ikan belum tercatat lengkap sehingga FCR berbasis biomass gain tidak dapat dihitung dengan keyakinan penuh.",
    metricName: "initial_biomass_known",
    metricValue: input.initialBiomassKnown ? 1 : 0,
    thresholdValue: 1,
    recommendedAction: "Lengkapi bobot rata-rata awal pada data tebar jika datanya tersedia.",
  };

  let fcrRule: RuleEvaluation = {
    ruleCode: "FCR_ABOVE_TARGET",
    active: false,
    severity: AlertSeverity.WARNING,
    title: "FCR dalam rentang evaluasi",
    message: "FCR belum melewati threshold alert.",
    metricName: "fcr",
    metricValue: input.fcr,
    thresholdValue: input.targetFcr,
    recommendedAction: null,
  };

  if (input.fcr !== null && input.targetFcr !== null && input.targetFcr > 0) {
    const ratio = input.fcr / input.targetFcr;
    const severity =
      ratio >= config.fcrCriticalMultiplier
        ? AlertSeverity.ACTION_REQUIRED
        : AlertSeverity.WARNING;
    const active = ratio >= config.fcrWarningMultiplier;

    fcrRule = {
      ruleCode: "FCR_ABOVE_TARGET",
      active,
      severity,
      title: active ? "FCR berada di atas target" : "FCR dalam rentang evaluasi",
      message: active
        ? `FCR saat ini ${input.fcr.toFixed(2)}, sekitar ${((ratio - 1) * 100).toFixed(1)}% di atas target ${input.targetFcr.toFixed(2)}.`
        : `FCR saat ini ${input.fcr.toFixed(2)} belum melewati batas warning ${(
            input.targetFcr * config.fcrWarningMultiplier
          ).toFixed(2)}.`,
      metricName: "fcr",
      metricValue: input.fcr,
      thresholdValue: input.targetFcr * config.fcrWarningMultiplier,
      recommendedAction: active
        ? "Periksa jumlah pakan terbaru, umur data sampling, kemungkinan pakan tidak termakan, respons makan ikan, kondisi air, dan mortalitas."
        : null,
      metadata: {
        targetFcr: input.targetFcr,
        ratio,
        warningMultiplier: config.fcrWarningMultiplier,
        criticalMultiplier: config.fcrCriticalMultiplier,
        resolutionMultiplier: config.fcrResolutionMultiplier,
      },
    };
  }

  let srRule: RuleEvaluation = {
    ruleCode: "SR_BELOW_TARGET",
    active: false,
    severity: AlertSeverity.WARNING,
    title: "Survival rate dalam target",
    message: "Survival rate belum melewati threshold alert.",
    metricName: "survival_rate_pct",
    metricValue: input.survivalRatePct,
    thresholdValue: input.targetSrPct,
    recommendedAction: null,
  };

  if (input.survivalRatePct !== null && input.targetSrPct !== null) {
    const shortfallPctPoints = input.targetSrPct - input.survivalRatePct;
    const active = shortfallPctPoints > 0;
    const severity =
      shortfallPctPoints >= config.srCriticalTolerancePctPoints
        ? AlertSeverity.ACTION_REQUIRED
        : AlertSeverity.WARNING;

    srRule = {
      ruleCode: "SR_BELOW_TARGET",
      active,
      severity,
      title: active ? "Survival rate di bawah target" : "Survival rate dalam target",
      message: active
        ? `Estimated SR saat ini ${input.survivalRatePct.toFixed(1)}%, lebih rendah ${shortfallPctPoints.toFixed(1)} poin persentase dari target ${input.targetSrPct.toFixed(1)}%.`
        : `Estimated SR saat ini ${input.survivalRatePct.toFixed(1)}% masih memenuhi target ${input.targetSrPct.toFixed(1)}%.`,
      metricName: "survival_rate_pct",
      metricValue: input.survivalRatePct,
      thresholdValue: input.targetSrPct,
      recommendedAction: active
        ? "Periksa tren mortalitas, perilaku ikan, kualitas air bila tersedia, respons makan, dan akurasi pencatatan jumlah ikan."
        : null,
      metadata: { shortfallPctPoints },
    };
  }

  const daysToHarvest = input.targetHarvestDate
    ? daysBetween(input.targetHarvestDate, input.now)
    : null;
  const harvestNear =
    daysToHarvest !== null &&
    daysToHarvest >= 0 &&
    daysToHarvest <= config.harvestNearDays;

  const harvestRule: RuleEvaluation = {
    ruleCode: "HARVEST_DATE_NEAR",
    active: harvestNear,
    severity: AlertSeverity.INFO,
    title: "Target panen semakin dekat",
    message:
      daysToHarvest === null
        ? "Target tanggal panen belum ditentukan."
        : `Target panen sekitar ${Math.ceil(daysToHarvest)} hari lagi.`,
    metricName: "days_to_target_harvest",
    metricValue: daysToHarvest,
    thresholdValue: config.harvestNearDays,
    recommendedAction: harvestNear
      ? "Pastikan sampling terbaru, proyeksi biomassa, kesiapan pembeli, dan kebutuhan operasional panen sudah diperiksa."
      : null,
  };

  return [samplingRule, initialBiomassRule, fcrRule, srRule, harvestRule];
}
