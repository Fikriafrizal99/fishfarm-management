export function calculateWeightGainG(
  currentAverageWeightG: number,
  previousAverageWeightG: number,
): number {
  if (currentAverageWeightG < 0 || previousAverageWeightG < 0) {
    throw new Error("Average weight cannot be negative");
  }

  return currentAverageWeightG - previousAverageWeightG;
}

export function calculateAdgGPerDay(
  currentAverageWeightG: number,
  previousAverageWeightG: number,
  currentSampledAt: Date,
  previousSampledAt: Date,
): number | null {
  const elapsedMs = currentSampledAt.getTime() - previousSampledAt.getTime();
  const elapsedDays = elapsedMs / 86_400_000;

  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) return null;

  return calculateWeightGainG(currentAverageWeightG, previousAverageWeightG) / elapsedDays;
}

export function calculateBiomassGainKg(input: {
  standingBiomassKg: number;
  harvestedBiomassKg?: number;
  initialBiomassKg: number;
}): number {
  if (
    input.standingBiomassKg < 0 ||
    (input.harvestedBiomassKg ?? 0) < 0 ||
    input.initialBiomassKg < 0
  ) {
    throw new Error("Biomass inputs cannot be negative");
  }

  return (
    input.standingBiomassKg +
    (input.harvestedBiomassKg ?? 0) -
    input.initialBiomassKg
  );
}

export function calculateFcr(
  cumulativeFeedKg: number,
  biomassGainKg: number,
): number | null {
  if (cumulativeFeedKg < 0) {
    throw new Error("Cumulative feed cannot be negative");
  }

  if (biomassGainKg <= 0) return null;
  return cumulativeFeedKg / biomassGainKg;
}
