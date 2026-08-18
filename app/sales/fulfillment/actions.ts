"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allocateOrderItem } from "@/src/application/sales/allocate-order-item";

export async function submitAllocation(formData: FormData): Promise<void> {
  try {
    const orderItemId = String(formData.get("orderItemId") ?? "").trim();
    const harvestLotId = String(formData.get("harvestLotId") ?? "").trim();
    const allocatedKg = Number(String(formData.get("allocatedKg") ?? "").trim());

    if (!orderItemId) throw new Error("Order item wajib dipilih");
    if (!harvestLotId) throw new Error("Harvest lot wajib dipilih");

    await allocateOrderItem({
      orderItemId,
      harvestLotId,
      allocatedKg,
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/orders");
    revalidatePath("/sales/fulfillment");
    revalidatePath("/sales/deliveries");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat alokasi";
    redirect(`/sales/fulfillment?error=${encodeURIComponent(message)}`);
  }

  redirect("/sales/fulfillment?saved=1");
}
