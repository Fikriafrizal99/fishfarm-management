"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeliveryStatus } from "@/src/generated/prisma/client";
import { recordDelivery, setDeliveryStatus } from "@/src/application/sales/record-delivery";

function requiredPositiveNumber(formData: FormData, key: string, label: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) throw new Error(`${label} tidak valid`);
  return value;
}

export async function submitDelivery(formData: FormData): Promise<void> {
  try {
    const orderItemId = String(formData.get("orderItemId") ?? "").trim();
    const plannedDate = String(formData.get("plannedDate") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? DeliveryStatus.PLANNED).trim();
    if (!orderItemId) throw new Error("Order item wajib dipilih");
    if (
      statusRaw !== DeliveryStatus.PLANNED &&
      statusRaw !== DeliveryStatus.DISPATCHED &&
      statusRaw !== DeliveryStatus.DELIVERED
    ) throw new Error("Status delivery tidak valid");

    await recordDelivery({
      orderItemId,
      quantityKg: requiredPositiveNumber(formData, "quantityKg", "Jumlah pengiriman"),
      plannedAt: plannedDate ? new Date(`${plannedDate}T09:00:00+07:00`) : undefined,
      status: statusRaw,
      recipientName: String(formData.get("recipientName") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath("/sales");
    revalidatePath("/sales/orders");
    revalidatePath("/sales/fulfillment");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan delivery";
    redirect(`/sales/fulfillment?error=${encodeURIComponent(message)}#delivery`);
  }

  redirect("/sales/fulfillment?deliverySaved=1#delivery");
}

export async function submitDeliveryStatus(formData: FormData): Promise<void> {
  try {
    const deliveryId = String(formData.get("deliveryId") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "").trim();
    if (!deliveryId) throw new Error("Delivery tidak ditemukan");
    if (!Object.values(DeliveryStatus).includes(statusRaw as DeliveryStatus)) throw new Error("Status delivery tidak valid");
    await setDeliveryStatus(deliveryId, statusRaw as DeliveryStatus);
    revalidatePath("/sales");
    revalidatePath("/sales/orders");
    revalidatePath("/sales/fulfillment");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status delivery";
    redirect(`/sales/fulfillment?error=${encodeURIComponent(message)}#delivery`);
  }

  redirect("/sales/fulfillment#delivery");
}
