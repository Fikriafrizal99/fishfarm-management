"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordInvoice, voidInvoice } from "@/src/application/sales/record-invoice";

function optionalNumber(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} tidak valid`);
  return value;
}

export async function submitInvoice(formData: FormData): Promise<void> {
  try {
    const salesOrderId = String(formData.get("salesOrderId") ?? "").trim();
    const issueDate = String(formData.get("issueDate") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    if (!salesOrderId) throw new Error("Sales order wajib dipilih");
    if (!issueDate) throw new Error("Tanggal invoice wajib diisi");

    await recordInvoice({
      salesOrderId,
      issueDate: new Date(`${issueDate}T12:00:00+07:00`),
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00+07:00`) : undefined,
      subtotalAmount: optionalNumber(formData, "subtotalAmount"),
      adjustmentAmount: optionalNumber(formData, "adjustmentAmount"),
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/orders");
    revalidatePath("/sales/finance");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat invoice";
    redirect(`/sales/finance?error=${encodeURIComponent(message)}#invoice`);
  }

  redirect("/sales/finance?invoiceSaved=1#invoice");
}

export async function submitVoidInvoice(formData: FormData): Promise<void> {
  try {
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    if (!invoiceId) throw new Error("Invoice tidak ditemukan");
    await voidInvoice(invoiceId);
    revalidatePath("/sales");
    revalidatePath("/sales/finance");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan invoice";
    redirect(`/sales/finance?error=${encodeURIComponent(message)}#invoice`);
  }

  redirect("/sales/finance#invoice");
}
