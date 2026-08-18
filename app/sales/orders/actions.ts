"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordSalesOrder } from "@/src/application/sales/record-sales-order";

function requiredNumber(formData: FormData, key: string, label: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) throw new Error(`${label} tidak valid`);
  return value;
}

export async function submitSalesOrder(formData: FormData): Promise<void> {
  try {
    const customerId = String(formData.get("customerId") ?? "").trim();
    const opportunityId = String(formData.get("opportunityId") ?? "").trim();
    const speciesId = String(formData.get("speciesId") ?? "").trim();
    const deliveryDate = String(formData.get("requestedDeliveryDate") ?? "").trim();

    if (!customerId) throw new Error("Customer wajib dipilih");
    if (!speciesId) throw new Error("Species wajib dipilih");

    await recordSalesOrder({
      customerId,
      opportunityId: opportunityId || undefined,
      speciesId,
      quantityKg: requiredNumber(formData, "quantityKg", "Jumlah order"),
      unitPricePerKg: requiredNumber(formData, "unitPricePerKg", "Harga per kg"),
      requestedDeliveryDate: deliveryDate ? new Date(`${deliveryDate}T12:00:00+07:00`) : undefined,
      paymentTerms: String(formData.get("paymentTerms") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/leads");
    revalidatePath("/sales/pipeline");
    revalidatePath("/sales/orders");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan sales order";
    redirect(`/sales/orders?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/orders?saved=1");
}
