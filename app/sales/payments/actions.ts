"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentMethod } from "@/src/generated/prisma/client";
import { recordPayment } from "@/src/application/sales/record-payment";

function requiredPositiveNumber(formData: FormData, key: string, label: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) throw new Error(`${label} tidak valid`);
  return value;
}

export async function submitPayment(formData: FormData): Promise<void> {
  try {
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    const paidDate = String(formData.get("paidDate") ?? "").trim();
    const methodRaw = String(formData.get("method") ?? PaymentMethod.TRANSFER).trim();
    if (!invoiceId) throw new Error("Invoice wajib dipilih");
    if (!paidDate) throw new Error("Tanggal pembayaran wajib diisi");
    if (!Object.values(PaymentMethod).includes(methodRaw as PaymentMethod)) throw new Error("Metode pembayaran tidak valid");

    await recordPayment({
      invoiceId,
      paidAt: new Date(`${paidDate}T12:00:00+07:00`),
      amount: requiredPositiveNumber(formData, "amount", "Nominal pembayaran"),
      method: methodRaw as PaymentMethod,
      reference: String(formData.get("reference") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/orders");
    revalidatePath("/sales/finance");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mencatat pembayaran";
    redirect(`/sales/finance?error=${encodeURIComponent(message)}#payment`);
  }

  redirect("/sales/finance?paymentSaved=1#payment");
}
