"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordSampling } from "@/src/application/sampling/record-sampling";
import { evaluateCycleAlerts } from "@/src/application/decision/evaluate-cycle-alerts";

function parseOptionalNumber(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} tidak valid`);
  return value;
}

export async function submitSampling(formData: FormData): Promise<void> {
  let cycleId = "";

  try {
    cycleId = String(formData.get("cycleId") ?? "").trim();
    const sampledDate = String(formData.get("sampledDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!cycleId) throw new Error("Kolam / siklus wajib dipilih");
    if (!sampledDate) throw new Error("Tanggal sampling wajib diisi");

    const sampleCount = Number(String(formData.get("sampleCount") ?? "").trim());
    if (!Number.isFinite(sampleCount)) throw new Error("Jumlah sampel tidak valid");

    await recordSampling({
      cycleId,
      sampledAt: new Date(`${sampledDate}T12:00:00+07:00`),
      sampleCount,
      totalSampleWeightKg: parseOptionalNumber(formData, "totalSampleWeightKg"),
      averageWeightG: parseOptionalNumber(formData, "averageWeightG"),
      averageLengthCm: parseOptionalNumber(formData, "averageLengthCm"),
      observedPopulation: parseOptionalNumber(formData, "observedPopulation"),
      notes,
    });

    try {
      await evaluateCycleAlerts(cycleId);
    } catch (decisionError) {
      console.error("Decision Engine evaluation failed after sampling", decisionError);
    }

    revalidatePath("/");
    revalidatePath("/sampling");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan sampling";
    const cycleQuery = cycleId ? `&cycleId=${encodeURIComponent(cycleId)}` : "";
    redirect(`/sampling?error=${encodeURIComponent(message)}${cycleQuery}`);
  }

  redirect(`/sampling?saved=1&cycleId=${encodeURIComponent(cycleId)}`);
}
