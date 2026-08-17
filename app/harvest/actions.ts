"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HarvestType } from "@/src/generated/prisma/client";
import { recordHarvest } from "@/src/application/harvest/record-harvest";
import { evaluateCycleAlerts } from "@/src/application/decision/evaluate-cycle-alerts";

function parseRequiredNumber(formData: FormData, key: string, label: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) throw new Error(`${label} tidak valid`);
  return value;
}

function parseOptionalNumber(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} tidak valid`);
  return value;
}

function parseHarvestType(value: string): HarvestType {
  return value === HarvestType.FINAL ? HarvestType.FINAL : HarvestType.PARTIAL;
}

export async function submitHarvest(formData: FormData): Promise<void> {
  let cycleId = "";
  let pondCode = "";

  try {
    cycleId = String(formData.get("cycleId") ?? "").trim();
    const harvestedDate = String(formData.get("harvestedDate") ?? "").trim();
    const buyerName = String(formData.get("buyerName") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!cycleId) throw new Error("Kolam / siklus wajib dipilih");
    if (!harvestedDate) throw new Error("Tanggal panen wajib diisi");

    const result = await recordHarvest({
      cycleId,
      harvestedAt: new Date(`${harvestedDate}T12:00:00+07:00`),
      harvestType: parseHarvestType(String(formData.get("harvestType") ?? "PARTIAL")),
      fishCount: parseOptionalNumber(formData, "fishCount"),
      weightKg: parseRequiredNumber(formData, "weightKg", "Berat panen"),
      sellingPricePerKg: parseRequiredNumber(
        formData,
        "sellingPricePerKg",
        "Harga jual per kg",
      ),
      buyerName,
      harvestCost: parseOptionalNumber(formData, "harvestCost"),
      notes,
    });

    pondCode = result.pondCode;

    try {
      await evaluateCycleAlerts(cycleId);
    } catch (decisionError) {
      console.error("Decision Engine evaluation failed after harvest", decisionError);
    }

    revalidatePath("/");
    revalidatePath("/harvest");
    revalidatePath(`/ponds/${result.pondCode}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan panen";
    const cycleQuery = cycleId ? `&cycleId=${encodeURIComponent(cycleId)}` : "";
    redirect(`/harvest?error=${encodeURIComponent(message)}${cycleQuery}`);
  }

  redirect(`/ponds/${encodeURIComponent(pondCode)}?harvestSaved=1`);
}
