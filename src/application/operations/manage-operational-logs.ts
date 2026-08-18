import {
  CycleStatus,
  ExpenseCategory,
  ExpenseSourceType,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { calculateAverageWeightG } from "@/src/domain/kpi/biology";

function active(status: CycleStatus): boolean {
  return status === CycleStatus.ACTIVE || status === CycleStatus.HARVESTING;
}

export async function getOperationalLogHistory() {
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) return null;

  const [sampling, feeding, mortality, expenses, harvests] = await Promise.all([
    db.samplingLog.findMany({
      where: { cycle: { farmId: farm.id } },
      include: { cycle: { include: { pond: true, species: true } } },
      orderBy: { sampledAt: "desc" }, take: 40,
    }),
    db.feedingLog.findMany({
      where: { cycle: { farmId: farm.id } },
      include: { cycle: { include: { pond: true } }, feedType: true },
      orderBy: { eventAt: "desc" }, take: 40,
    }),
    db.mortalityLog.findMany({
      where: { cycle: { farmId: farm.id } },
      include: { cycle: { include: { pond: true } } },
      orderBy: { eventAt: "desc" }, take: 40,
    }),
    db.expense.findMany({
      where: { farmId: farm.id, sourceType: ExpenseSourceType.MANUAL },
      include: { cycle: { include: { pond: true } }, pond: true },
      orderBy: { expenseDate: "desc" }, take: 50,
    }),
    db.harvest.findMany({
      where: { cycle: { farmId: farm.id } },
      include: { cycle: { include: { pond: true, species: true } }, harvestLot: true },
      orderBy: { harvestedAt: "desc" }, take: 30,
    }),
  ]);

  return { sampling, feeding, mortality, expenses, harvests };
}

export async function updateSamplingLog(command: {
  id: string;
  sampledAt: Date;
  sampleCount: number;
  totalSampleWeightKg?: number;
  averageWeightG?: number;
  averageLengthCm?: number;
  observedPopulation?: number;
  notes?: string;
}) {
  if (!Number.isInteger(command.sampleCount) || command.sampleCount <= 0) throw new Error("Jumlah sampel harus positif");
  if (Number.isNaN(command.sampledAt.getTime())) throw new Error("Tanggal sampling tidak valid");
  if (command.totalSampleWeightKg !== undefined && command.totalSampleWeightKg <= 0) throw new Error("Total berat harus positif");
  if (command.averageWeightG !== undefined && command.averageWeightG <= 0) throw new Error("ABW harus positif");
  if (command.averageLengthCm !== undefined && command.averageLengthCm <= 0) throw new Error("Panjang harus positif");
  if (command.observedPopulation !== undefined && (!Number.isInteger(command.observedPopulation) || command.observedPopulation <= 0)) throw new Error("Populasi teramati harus positif");
  if (command.totalSampleWeightKg === undefined && command.averageWeightG === undefined) throw new Error("Isi total berat atau ABW");

  const log = await db.samplingLog.findUnique({ where: { id: command.id }, include: { cycle: { include: { stockings: true } } } });
  if (!log) throw new Error("Sampling tidak ditemukan");
  if (!active(log.cycle.status)) throw new Error("Sampling pada siklus selesai bersifat read-only");

  const calculated = command.totalSampleWeightKg === undefined ? undefined : calculateAverageWeightG(command.totalSampleWeightKg, command.sampleCount);
  if (calculated !== undefined && command.averageWeightG !== undefined) {
    const diff = Math.abs(calculated - command.averageWeightG) / calculated;
    if (diff > 0.05) throw new Error(`ABW tidak konsisten. Hasil hitung sekitar ${calculated.toFixed(1)} g/ekor`);
  }
  const resolved = command.averageWeightG ?? calculated!;
  const stocked = log.cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
  if (command.observedPopulation !== undefined && stocked > 0 && command.observedPopulation > stocked) throw new Error(`Populasi teramati melebihi ikan tebar ${stocked} ekor`);

  return db.samplingLog.update({
    where: { id: log.id },
    data: {
      sampledAt: command.sampledAt,
      sampleCount: command.sampleCount,
      totalSampleWeightKg: command.totalSampleWeightKg ?? null,
      averageWeightG: resolved,
      averageLengthCm: command.averageLengthCm ?? null,
      observedPopulation: command.observedPopulation ?? null,
      notes: command.notes?.trim() || null,
    },
  });
}

export async function updateFeedingLog(command: { id: string; eventAt: Date; quantityKg: number; notes?: string }) {
  if (!Number.isFinite(command.quantityKg) || command.quantityKg <= 0) throw new Error("Pakan harus lebih besar dari 0");
  const log = await db.feedingLog.findUnique({ where: { id: command.id }, include: { cycle: true } });
  if (!log) throw new Error("Log pakan tidak ditemukan");
  if (!active(log.cycle.status)) throw new Error("Log pada siklus selesai bersifat read-only");

  return db.$transaction(async (tx) => {
    const updated = await tx.feedingLog.update({ where: { id: log.id }, data: { eventAt: command.eventAt, quantityKg: command.quantityKg, notes: command.notes?.trim() || null } });
    const expense = await tx.expense.findFirst({ where: { sourceType: ExpenseSourceType.FEEDING, sourceId: log.id } });
    if (expense && log.unitCostPerKg !== null) {
      await tx.expense.update({ where: { id: expense.id }, data: { expenseDate: command.eventAt, amount: command.quantityKg * Number(log.unitCostPerKg), description: `Pakan ${command.quantityKg} kg` } });
    }
    return updated;
  });
}

export async function updateMortalityLog(command: { id: string; eventAt: Date; quantity: number; notes?: string }) {
  if (!Number.isInteger(command.quantity) || command.quantity <= 0) throw new Error("Mortalitas harus bilangan bulat positif");
  const log = await db.mortalityLog.findUnique({ where: { id: command.id }, include: { cycle: { include: { stockings: true, mortalityLogs: true, harvests: true } } } });
  if (!log) throw new Error("Log mortalitas tidak ditemukan");
  if (!active(log.cycle.status)) throw new Error("Log pada siklus selesai bersifat read-only");
  const stocked = log.cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
  const otherMortality = log.cycle.mortalityLogs.filter((row) => row.id !== log.id).reduce((sum, row) => sum + row.quantity, 0);
  const harvested = log.cycle.harvests.reduce((sum, row) => sum + (row.fishCount ?? 0), 0);
  const max = Math.max(stocked - otherMortality - harvested, 0);
  if (command.quantity > max) throw new Error(`Mortalitas melebihi estimasi populasi tersedia ${max} ekor`);
  return db.mortalityLog.update({ where: { id: log.id }, data: { eventAt: command.eventAt, quantity: command.quantity, notes: command.notes?.trim() || null } });
}

export async function updateManualExpense(command: { id: string; expenseDate: Date; category: ExpenseCategory; amount: number; description: string; notes?: string }) {
  if (!Number.isFinite(command.amount) || command.amount <= 0) throw new Error("Nominal biaya harus lebih besar dari 0");
  const expense = await db.expense.findUnique({ where: { id: command.id }, include: { cycle: true } });
  if (!expense || expense.sourceType !== ExpenseSourceType.MANUAL) throw new Error("Biaya manual tidak ditemukan");
  if (expense.cycle && !active(expense.cycle.status)) throw new Error("Biaya pada siklus selesai bersifat read-only");
  return db.expense.update({
    where: { id: expense.id },
    data: { expenseDate: command.expenseDate, category: command.category, amount: command.amount, description: command.description.trim() || "Biaya operasional", notes: command.notes?.trim() || null },
  });
}
