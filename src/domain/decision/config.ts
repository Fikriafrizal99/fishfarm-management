export interface DecisionEngineConfig {
  ruleVersion: string;
  samplingMaxAgeDays: number;
  fcrWarningMultiplier: number;
  fcrCriticalMultiplier: number;
  fcrResolutionMultiplier: number;
  srCriticalTolerancePctPoints: number;
  harvestNearDays: number;
}

export const DEFAULT_DECISION_ENGINE_CONFIG: DecisionEngineConfig = {
  ruleVersion: "decision-v1",
  samplingMaxAgeDays: 7,
  fcrWarningMultiplier: 1.1,
  fcrCriticalMultiplier: 1.2,
  fcrResolutionMultiplier: 1.05,
  srCriticalTolerancePctPoints: 5,
  harvestNearDays: 14,
};
