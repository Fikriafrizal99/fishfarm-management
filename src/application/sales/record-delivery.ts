import { DeliveryStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { syncOrderFulfillmentStatus } from "./sync-order-fulfillment-status";

export interface RecordDeliveryCommand {
  orderItemId: string;
  quantityKg: number;
  plannedAt?: Date;
  status?: DeliveryStatus;
  recipientName?: string;
  notes?: string;
}

function dateCode(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function recordDelivery(command: RecordDeliveryCommand) {
  if (!Number.isFinite(command.quantityKg) || command.quantityKg <= 0) {
    throw new Error("Jumlah pengiriman harus lebih besar dari 0");
  }
  if (command.plannedAt && Number.isNaN(command.plannedAt.getTime())) {
    throw new Error("Tanggal pengiriman tidak valid");
  }

  return db.$transaction(async (tx) => {
    const item = await tx.salesOrderItem.findUnique({
      where: { id: command.orderItemId },
      include: {
        salesOrder: { include: { customer: true } },
        allocations: true,
        deliveryItems: { include: { delivery: true } },
      },
    });
    if (!item) throw new Error("Sales order item tidak ditemukan");
    if (item.salesOrder.status === "CANCELLED") throw new Error("Order sudah dibatalkan");

    const allocatedKg = item.allocations
      .filter((row) => row.status !== "CANCELLED")
      .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
    const bookedDeliveryKg = item.deliveryItems
      .filter((row) => row.delivery.status !== DeliveryStatus.CANCELLED)
      .reduce((sum, row) => sum + Number(row.quantityKg), 0);
    const deliverableKg = Math.max(allocatedKg - bookedDeliveryKg, 0);

    if (command.quantityKg > deliverableKg + 1e-9) {
      throw new Error(`Pengiriman melebihi quantity teralokasi yang belum dijadwalkan (${deliverableKg.toFixed(3)} kg)`);
    }

    const now = new Date();
    const status = command.status ?? DeliveryStatus.PLANNED;
    const dailyCount = await tx.delivery.count({
      where: {
        farmId: item.salesOrder.farmId,
        deliveryNumber: { startsWith: `DO-${dateCode(now)}-` },
      },
    });
    const deliveryNumber = `DO-${dateCode(now)}-${String(dailyCount + 1).padStart(3, "0")}`;

    const delivery = await tx.delivery.create({
      data: {
        farmId: item.salesOrder.farmId,
        salesOrderId: item.salesOrderId,
        deliveryNumber,
        status,
        plannedAt: command.plannedAt,
        dispatchedAt:
          status === DeliveryStatus.DISPATCHED || status === DeliveryStatus.DELIVERED
            ? now
            : undefined,
        deliveredAt: status === DeliveryStatus.DELIVERED ? now : undefined,
        recipientName: command.recipientName?.trim() || undefined,
        notes: command.notes?.trim() || undefined,
        items: {
          create: {
            orderItemId: item.id,
            quantityKg: command.quantityKg,
          },
        },
      },
      include: { items: true, salesOrder: true },
    });

    await syncOrderFulfillmentStatus(tx, item.salesOrderId);
    return delivery;
  });
}

export async function setDeliveryStatus(deliveryId: string, status: DeliveryStatus) {
  return db.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new Error("Delivery tidak ditemukan");
    if (delivery.status === DeliveryStatus.CANCELLED && status !== DeliveryStatus.CANCELLED) {
      throw new Error("Delivery yang sudah dibatalkan tidak dapat diaktifkan kembali");
    }
    if (delivery.status === DeliveryStatus.DELIVERED && status !== DeliveryStatus.DELIVERED) {
      throw new Error("Delivery yang sudah DELIVERED tidak dapat diubah kembali");
    }
    if (delivery.status === DeliveryStatus.DISPATCHED && status === DeliveryStatus.PLANNED) {
      throw new Error("Delivery DISPATCHED tidak dapat dikembalikan ke PLANNED");
    }

    const now = new Date();
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status,
        dispatchedAt:
          status === DeliveryStatus.DISPATCHED || status === DeliveryStatus.DELIVERED
            ? delivery.dispatchedAt ?? now
            : delivery.dispatchedAt,
        deliveredAt:
          status === DeliveryStatus.DELIVERED ? delivery.deliveredAt ?? now : delivery.deliveredAt,
      },
    });

    await syncOrderFulfillmentStatus(tx, delivery.salesOrderId);
    return updated;
  });
}
