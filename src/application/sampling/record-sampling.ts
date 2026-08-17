import { CycleStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { calculateAverageWeightG } from "@/src/domain/kpi/biology";

export interface RecordSamplingCommand {
  cycleId: string;
  sampledAt: Date;
  sampleCount: number;
  totalSampleWeightKg?: number;
  averageWeightG?: number;
  averageLengthCm?: number;
  observedPopulation?: number;
  notes?: string;
  createdById?: string;
}

export interface RecordSamplingResult {
  samplingLogId: string;
  resolvedAverageWeightG: number;
}

function positiveOptional(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus lebih besar dari 0`);
  }
}

export async function recordSampling(
  command: RecordSamplingCommand,
): Promise<RecordSamplingResult> {
  if (!Number.isInteger(command.sampleCount) || command.sampleCount <= 0) {
    throw new Error("Jumlah sampel harus berupa bilangan bulat positif");
  }

  if (Number.isNaN(command.sampledAt.getTime())) {
    throw new Error("Tanggal sampling tidak valid");
  }

  positiveOptional("Total berat sampel", command.totalSampleWeightKg);
  positiveOptional("Bobot rata-rata", command.averageWeightG);
  positiveOptional("Panjang rata-rata", command.averageLengthCm);

  if (
    command.observedPopulation !== undefined &&
    (!Number.isInteger(command.observedPopulation) || command.observedPopulation <= 0)
  ) {
    throw new Error("Populasi teramati harus berupa bilangan bulat positif");
  }

  if (
    command.totalSampleWeightKg === undefined &&
    command.averageWeightG === undefined
  ) {
    throw new Error("Isi total berat sampel atau bobot rata-rata ikan");
  }

  const calculatedAverageWeightG =
    command.totalSampleWeightKg === undefined
      ? undefined
      : calculateAverageWeightG(command.totalSampleWeightKg, command.sampleCount);

  if (
    calculatedAverageWeightG !== undefined &&
    command.averageWeightG !== undefined
  ) {
    const relativeDifference =
      Math.abs(calculatedAverageWeightG - command.averageWeightG) /
      calculatedAverageWeightG;

    if (relativeDifference > 0.05) {
      throw new Error(
        `Bobot rata-rata tidak konsisten dengan total berat sampel. Hasil hitung sekitar ${calculatedAverageWeightG.toFixed(1)} g/ekor`,
      );
    }
  }

  const resolvedAverageWeightG =
    command.averageWeightG ?? calculatedAverageWeightG;

  if (resolvedAverageWeightG === undefined) {
    throw new Error("Bobot rata-rata sampling tidak dapat dihitung");
  }

  return db.$transaction(async (tx) => {
    const cycle = await tx.productionCycle.findUnique({
      where: { id: command.cycleId },
      include: { stockings: { select: { quantity: true } } },
    });

    if (!cycle) throw new Error("Siklus budidaya tidak ditemukan");
    if (
      cycle.status !== CycleStatus.ACTIVE &&
      cycle.status !== CycleStatus.HARVESTING
    ) {
      throw new Error("Sampling hanya dapat dicatat pada siklus aktif");
    }

    const totalStocked = cycle.stockings.reduce(
      (sum, stocking) => sum + stocking.quantity,
      0,
    );

    if (
      command.observedPopulation !== undefined &&
      totalStocked > 0 &&
      command.observedPopulation > totalStocked
    ) {
      throw new Error(
        `Populasi teramati tidak boleh melebihi total ikan tebar ${totalStocked} ekor`,
      );
    }

    const sampling = await tx.samplingLog.create({
      data: {
        cycleId: cycle.id,
        sampledAt: command.sampledAt,
        sampleCount: command.sampleCount,
        totalSampleWeightKg: command.totalSampleWeightKg,
        averageWeightG: resolvedAverageWeightG,
        averageLengthCm: command.averageLengthCm,
        observedPopulation: command.observedPopulation,
        notes: command.notes?.trim() || undefined,
        createdById: command.createdById,
      },
    });

    return {
      samplingLogId: sampling.id,
      resolvedAverageWeightG,
    };
  });
}
