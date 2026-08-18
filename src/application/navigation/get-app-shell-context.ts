import { AlertStatus, CycleStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

export interface AppShellContext {
  farmId: string;
  farmName: string;
  ownerName: string | null;
  activePonds: number;
  openAlertCount: number;
}

export async function getAppShellContext(
  farmId?: string,
): Promise<AppShellContext | null> {
  const farm = farmId
    ? await db.farm.findUnique({
        where: { id: farmId },
        include: {
          memberships: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      })
    : await db.farm.findFirst({
        orderBy: { createdAt: "asc" },
        include: {
          memberships: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

  if (!farm) return null;

  const [activePonds, openAlertCount] = await Promise.all([
    db.productionCycle.count({
      where: {
        farmId: farm.id,
        status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] },
      },
    }),
    db.alert.count({
      where: {
        status: AlertStatus.OPEN,
        cycle: { farmId: farm.id },
      },
    }),
  ]);

  return {
    farmId: farm.id,
    farmName: farm.name,
    ownerName: farm.memberships[0]?.user.name ?? null,
    activePonds,
    openAlertCount,
  };
}
