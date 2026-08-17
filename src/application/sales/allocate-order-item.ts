import { FulfillmentStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface AllocateOrderItemCommand {
  orderItemId: string;
  harvestLotId: string;
  allocatedKg: number;
  notes?: string;
}

export async function allocateOrderItem(command: AllocateOrderItemCommand) {
  if (!Number.isFinite(command.allocatedKg) || command.allocatedKg <= 0) {
    throw new Error("Jumlah alokasi harus lebih besar dari 0");
  }

  return db.$transaction(async (tx) => {
    const [item, lot] = await Promise.all([
      tx.salesOrderItem.findUnique({
        where: { id: command.orderItemId },
        include: {
          salesOrder: true,
          allocations: true,
        },
      }),
      tx.harvestLot.findUnique({
        where: { id: command.harvestLotId },
        include: { allocations: true },
      }),
    ]);

    if (!item) throw new Error("Sales order item tidak ditemukan");
    if (!lot) throw new Error("Harvest lot tidak ditemukan");
    if (item.salesOrder.farmId !== lot.farmId) {
      throw new Error("Order dan harvest lot harus berasal dari farm yang sama");
    }
    if (item.speciesId !== lot.speciesId) {
      throw new Error("Species order dan harvest lot tidak sama");
    }

    const itemAllocatedKg = item.allocations
      .filter((row) => row.status !== FulfillmentStatus.CANCELLED)
      .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
    const itemRemainingKg = Math.max(Number(item.quantityKg) - itemAllocatedKg, 0);

    const lotAllocatedKg = lot.allocations
      .filter((row) => row.status !== FulfillmentStatus.CANCELLED)
      .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
    const lotAvailableKg = Math.max(Number(lot.quantityKg) - lotAllocatedKg, 0);

    if (command.allocatedKg > itemRemainingKg) {
      throw new Error(
        `Alokasi melebihi sisa order ${itemRemainingKg.toFixed(3)} kg`,
      );
    }
    if (command.allocatedKg > lotAvailableKg) {
      throw new Error(
        `Alokasi melebihi stok lot tersedia ${lotAvailableKg.toFixed(3)} kg`,
      );
    }

    return tx.fulfillmentAllocation.create({
      data: {
        orderItemId: item.id,
        harvestLotId: lot.id,
        allocatedKg: command.allocatedKg,
        status: FulfillmentStatus.RESERVED,
        notes: command.notes?.trim() || undefined,
      },
    });
  });
}
