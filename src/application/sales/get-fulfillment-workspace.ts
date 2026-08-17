import {
  FulfillmentStatus,
  SalesOrderStatus,
} from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export async function getFulfillmentWorkspace() {
  const farm = await db.farm.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!farm) return { orderItems: [], harvestLots: [] };

  const [items, lots] = await Promise.all([
    db.salesOrderItem.findMany({
      where: {
        salesOrder: {
          farmId: farm.id,
          status: {
            in: [
              SalesOrderStatus.CONFIRMED,
              SalesOrderStatus.PARTIALLY_FULFILLED,
            ],
          },
        },
      },
      include: {
        species: true,
        salesOrder: { include: { customer: true } },
        allocations: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.harvestLot.findMany({
      where: { farmId: farm.id },
      include: {
        species: true,
        harvest: { include: { cycle: { include: { pond: true } } } },
        allocations: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orderItems = items
    .map((item) => {
      const allocatedKg = item.allocations
        .filter((row) => row.status !== FulfillmentStatus.CANCELLED)
        .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
      const quantityKg = Number(item.quantityKg);
      return {
        id: item.id,
        orderNumber: item.salesOrder.orderNumber,
        customerName: item.salesOrder.customer.name,
        speciesId: item.speciesId,
        species: item.species.commonName,
        quantityKg,
        allocatedKg,
        remainingKg: Math.max(quantityKg - allocatedKg, 0),
      };
    })
    .filter((item) => item.remainingKg > 0);

  const harvestLots = lots
    .map((lot) => {
      const allocatedKg = lot.allocations
        .filter((row) => row.status !== FulfillmentStatus.CANCELLED)
        .reduce((sum, row) => sum + Number(row.allocatedKg), 0);
      const quantityKg = Number(lot.quantityKg);
      return {
        id: lot.id,
        lotCode: lot.lotCode,
        speciesId: lot.speciesId,
        species: lot.species.commonName,
        pondCode: lot.harvest.cycle.pond.code,
        quantityKg,
        allocatedKg,
        availableKg: Math.max(quantityKg - allocatedKg, 0),
      };
    })
    .filter((lot) => lot.availableKg > 0);

  return { orderItems, harvestLots };
}
