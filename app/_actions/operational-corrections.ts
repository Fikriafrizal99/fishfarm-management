"use server";

import { redirect } from "next/navigation";
import { ExpenseCategory } from "@/src/generated/prisma/client";
import { evaluateCycleAlerts } from "@/src/application/decision/evaluate-cycle-alerts";
import {
  updateFeedingLog,
  updateManualExpense,
  updateMortalityLog,
  updateSamplingLog,
} from "@/src/application/operations/manage-operational-logs";

function text(formData: FormData, name: string): string { return String(formData.get(name) ?? "").trim(); }
function optionalNumber(formData: FormData, name: string): number | undefined {
  const raw = text(formData, name); if (!raw) return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined;
}
function date(formData: FormData, name: string): Date {
  const raw = text(formData, name); const value = new Date(`${raw}T12:00:00+07:00`); if (!raw || Number.isNaN(value.getTime())) throw new Error("Tanggal tidak valid"); return value;
}
async function reevaluate(cycleId: string | null | undefined) { if (!cycleId) return; try { await evaluateCycleAlerts(cycleId); } catch (error) { console.error("Decision Engine reevaluation failed after correction", error); } }

export async function correctSampling(formData: FormData) {
  try {
    const updated = await updateSamplingLog({
      id: text(formData, "id"), sampledAt: date(formData, "sampledAt"), sampleCount: Number(text(formData, "sampleCount")),
      totalSampleWeightKg: optionalNumber(formData, "totalSampleWeightKg"), averageWeightG: optionalNumber(formData, "averageWeightG"),
      averageLengthCm: optionalNumber(formData, "averageLengthCm"), observedPopulation: optionalNumber(formData, "observedPopulation"), notes: text(formData, "notes") || undefined,
    });
    await reevaluate(updated.cycleId);
  } catch (error) { redirect(`/sampling?error=${encodeURIComponent(error instanceof Error ? error.message : "Gagal mengubah sampling")}`); }
  redirect("/sampling?updated=1");
}

export async function correctFeed(formData: FormData) {
  try {
    const updated = await updateFeedingLog({ id: text(formData, "id"), eventAt: date(formData, "eventAt"), quantityKg: Number(text(formData, "quantityKg")), notes: text(formData, "notes") || undefined });
    await reevaluate(updated.cycleId);
  } catch (error) { redirect(`/input?error=${encodeURIComponent(error instanceof Error ? error.message : "Gagal mengubah pakan")}`); }
  redirect("/input?updated=1");
}

export async function correctMortality(formData: FormData) {
  try {
    const updated = await updateMortalityLog({ id: text(formData, "id"), eventAt: date(formData, "eventAt"), quantity: Number(text(formData, "quantity")), notes: text(formData, "notes") || undefined });
    await reevaluate(updated.cycleId);
  } catch (error) { redirect(`/input?error=${encodeURIComponent(error instanceof Error ? error.message : "Gagal mengubah mortalitas")}`); }
  redirect("/input?updated=1");
}

export async function correctExpense(formData: FormData) {
  try {
    const updated = await updateManualExpense({ id: text(formData, "id"), expenseDate: date(formData, "expenseDate"), category: text(formData, "category") as ExpenseCategory, amount: Number(text(formData, "amount")), description: text(formData, "description"), notes: text(formData, "notes") || undefined });
    await reevaluate(updated.cycleId);
  } catch (error) { redirect(`/expenses?error=${encodeURIComponent(error instanceof Error ? error.message : "Gagal mengubah biaya")}`); }
  redirect("/expenses?updated=1");
}
