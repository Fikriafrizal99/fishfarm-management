"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordLead } from "@/src/application/sales/record-lead";

function optionalNumber(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} tidak valid`);
  return value;
}

export async function submitLead(formData: FormData): Promise<void> {
  try {
    const nextFollowUpDate = String(formData.get("nextFollowUpDate") ?? "").trim();

    await recordLead({
      speciesId: String(formData.get("speciesId") ?? "").trim() || undefined,
      title: String(formData.get("title") ?? ""),
      source: String(formData.get("source") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      expectedDemandKg: optionalNumber(formData, "expectedDemandKg"),
      expectedPricePerKg: optionalNumber(formData, "expectedPricePerKg"),
      nextFollowUpAt: nextFollowUpDate
        ? new Date(`${nextFollowUpDate}T10:00:00+07:00`)
        : undefined,
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/leads");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan lead";
    redirect(`/sales/leads?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/leads?saved=1");
}
