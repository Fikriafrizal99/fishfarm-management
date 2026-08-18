import { AlertStatus } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";

export async function getAlertCenter() {
  const shell = await getAppShellContext();
  if (!shell) return null;

  const alerts = await db.alert.findMany({
    where: {
      cycle: { farmId: shell.farmId },
    },
    include: {
      cycle: {
        include: {
          pond: true,
          species: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { triggeredAt: "desc" },
    ],
    take: 50,
  });

  return {
    shell,
    open: alerts.filter((alert) => alert.status === AlertStatus.OPEN),
    history: alerts.filter((alert) => alert.status !== AlertStatus.OPEN),
  };
}
