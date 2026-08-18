import {
  FulfillmentStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import type { Prisma } from "@/src/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

export async function syncOrderFulfillmentStatus(
  tx: TransactionClient,
  salesOrderId: string,
): Promise<SalesOrderStatus> {
  const order = await tx.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      items: {
        include: {
          allocations: true,
          deliveryItems: { include: { delivery: true } },
        },
      },
    },
  });

  if (!order) throw new Error("Sales order tidak ditemukan");
  if (order.status === SalesOrderStatus.CANCELLED) return order.status;

  let anyAllocated = false;
  let anyDelivered = false;
  let allDelivered = order.items.length > 0;

  for (const item of order.items) {
    const allocatedKg = item.allocations
      .filter((row) => row.status !== FulfillmentStatus.CANCELLED)
      .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
    const deliveredKg = item.deliveryItems
      .filter((row) => row.delivery.status !== "CANCELLED")
      .reduce((sum, row) => sum + Number(row.quantityKg), 0);
    const requestedKg = Number(item.quantityKg);

    if (allocatedKg > 0) anyAllocated = true;
    if (deliveredKg > 0) anyDelivered = true;
    if (deliveredKg + 1e-9 < requestedKg) allDelivered = false;

    const allocationStatus =
      allocatedKg > 0 && deliveredKg + 1e-9 >= allocatedKg
        ? FulfillmentStatus.FULFILLED
        : FulfillmentStatus.RESERVED;

    await tx.fulfillmentAllocation.updateMany({
      where: {
        orderItemId: item.id,
        status: { not: FulfillmentStatus.CANCELLED },
      },
      data: { status: allocationStatus },
    });
  }

  const nextStatus = allDelivered
    ? SalesOrderStatus.FULFILLED
    : anyDelivered || anyAllocated
      ? SalesOrderStatus.PARTIALLY_FULFILLED
      : SalesOrderStatus.CONFIRMED;

  if (order.status !== nextStatus) {
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: nextStatus },
    });
  }

  return nextStatus;
}
