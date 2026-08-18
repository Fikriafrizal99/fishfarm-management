"use server";

import { redirect } from "next/navigation";
import { createCycle, updateCycle } from "@/src/application/management/manage-production";
import { cancelCycle } from "@/src/application/management/manage-lifecycle";
import { evaluateCycleAlerts } from "@/src/application/decision/evaluate-cycle-alerts";

function text(formData: FormData, name: string): string { return String(formData.get(name) ?? "").trim(); }
function optionalNumber(formData: FormData, name: string): number | undefined {
  const raw = text(formData, name); if (!raw) return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined;
}
function dateValue(formData: FormData, name: string, required = false): Date | undefined {
  const raw = text(formData, name);
  if (!raw) { if (required) throw new Error(`${name} wajib diisi`); return undefined; }
  const value = new Date(`${raw}T12:00:00+07:00`);
  if (Number.isNaN(value.getTime())) throw new Error(`${name} tidak valid`);
  return value;
}

export async function saveCycle(formData: FormData) {
  const cycleId = text(formData, "cycleId");
  try {
    const common = {
      targetHarvestDate: dateValue(formData, "targetHarvestDate"),
      targetSrPct: optionalNumber(formData, "targetSrPct"),
      targetFcr: optionalNumber(formData, "targetFcr"),
      targetHarvestWeightKg: optionalNumber(formData, "targetHarvestWeightKg"),
      targetHppPerKg: optionalNumber(formData, "targetHppPerKg"),
      targetSellingPricePerKg: optionalNumber(formData, "targetSellingPricePerKg"),
      stockingQuantity: Number(text(formData, "stockingQuantity")),
      stockingAvgWeightG: optionalNumber(formData, "stockingAvgWeightG"),
      seedCostPerUnit: optionalNumber(formData, "seedCostPerUnit"),
      supplier: text(formData, "supplier") || undefined,
      notes: text(formData, "notes") || undefined,
    };

    const saved = cycleId
      ? await updateCycle({ cycleId, ...common })
      : await createCycle({
          pondId: text(formData, "pondId"),
          speciesId: text(formData, "speciesId"),
          cycleCode: text(formData, "cycleCode"),
          startedAt: dateValue(formData, "startedAt", true)!,
          ...common,
        });

    try { await evaluateCycleAlerts(saved.id); } catch (error) { console.error("Decision Engine failed after cycle save", error); }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan siklus";
    redirect(`/cycles?error=${encodeURIComponent(message)}${cycleId ? `&edit=${encodeURIComponent(cycleId)}` : ""}`);
  }
  redirect("/cycles?saved=1");
}

export async function cancelCycleAction(formData: FormData) {
  try {
    await cancelCycle(text(formData, "cycleId"));
  } catch (error) {
    redirect(`/cycles?error=${encodeURIComponent(error instanceof Error ? error.message : "Gagal membatalkan siklus")}`);
  }
  redirect("/cycles?cancelled=1");
}
