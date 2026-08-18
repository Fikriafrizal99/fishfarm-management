"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OpportunityStatus } from "@/src/generated/prisma/client";
import {
  recordOpportunity,
  setOpportunityStatus,
} from "@/src/application/sales/record-opportunity";

function optionalPositiveNumber(formData: FormData, key: string, label: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} tidak valid`);
  return value;
}

export async function submitOpportunity(formData: FormData): Promise<void> {
  try {
    const customerId = String(formData.get("customerId") ?? "").trim();
    const leadId = String(formData.get("leadId") ?? "").trim();
    const speciesId = String(formData.get("speciesId") ?? "").trim();
    const closeDate = String(formData.get("expectedCloseDate") ?? "").trim();
    if (!customerId) throw new Error("Customer wajib dipilih");

    await recordOpportunity({
      customerId,
      leadId: leadId || undefined,
      speciesId: speciesId || undefined,
      title: String(formData.get("title") ?? ""),
      expectedQtyKg: optionalPositiveNumber(formData, "expectedQtyKg", "Estimasi quantity"),
      expectedPricePerKg: optionalPositiveNumber(formData, "expectedPricePerKg", "Estimasi harga"),
      expectedCloseDate: closeDate ? new Date(`${closeDate}T12:00:00+07:00`) : undefined,
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/leads");
    revalidatePath("/sales/pipeline");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan opportunity";
    redirect(`/sales/pipeline?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/pipeline?saved=1");
}

export async function submitOpportunityStatus(formData: FormData): Promise<void> {
  try {
    const opportunityId = String(formData.get("opportunityId") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "").trim();
    if (!opportunityId) throw new Error("Opportunity tidak ditemukan");
    if (![OpportunityStatus.OPEN, OpportunityStatus.WON, OpportunityStatus.LOST].includes(statusRaw as OpportunityStatus)) {
      throw new Error("Status opportunity tidak valid");
    }
    await setOpportunityStatus(opportunityId, statusRaw as OpportunityStatus);
    revalidatePath("/sales");
    revalidatePath("/sales/pipeline");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status opportunity";
    redirect(`/sales/pipeline?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/pipeline");
}
