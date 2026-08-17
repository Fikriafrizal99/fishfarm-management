export function calculateAverageWeightG(
  totalSampleWeightKg: number,
  sampleCount: number,
): number {
  if (totalSampleWeightKg <= 0 || sampleCount <= 0) {
    throw new Error("Sample weight and sample count must be positive");
  }

  return (totalSampleWeightKg * 1000) / sampleCount;
}

export function calculateEstimatedPopulation(
  stocked: number,
  mortality: number,
  harvestedFishCount = 0,
): number {
  if (stocked < 0 || mortality < 0 || harvestedFishCount < 0) {
    throw new Error("Population inputs cannot be negative");
  }

  return Math.max(stocked - mortality - harvestedFishCount, 0);
}

export function calculateSurvivalRatePct(
  estimatedPopulation: number,
  stocked: number,
): number | null {
  if (stocked <= 0) return null;
  return (estimatedPopulation / stocked) * 100;
}

export function calculateMortalityRatePct(
  mortality: number,
  stocked: number,
): number | null {
  if (stocked <= 0) return null;
  return (mortality / stocked) * 100;
}

export function calculateEstimatedBiomassKg(
  estimatedPopulation: number,
  averageWeightG: number,
): number {
  if (estimatedPopulation < 0 || averageWeightG < 0) {
    throw new Error("Biomass inputs cannot be negative");
  }

  return (estimatedPopulation * averageWeightG) / 1000;
}
