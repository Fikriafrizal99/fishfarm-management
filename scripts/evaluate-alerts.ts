import "dotenv/config";
import { CycleStatus } from "../src/generated/prisma/client";
import { db } from "../src/lib/db";
import { evaluateCycleAlerts } from "../src/application/decision/evaluate-cycle-alerts";

async function main() {
  const cycles = await db.productionCycle.findMany({
    where: { status: { in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING] } },
    select: { id: true, cycleCode: true },
    orderBy: { createdAt: "asc" },
  });

  for (const cycle of cycles) {
    const result = await evaluateCycleAlerts(cycle.id);
    console.log(cycle.cycleCode, result);
  }

  console.log(`Decision Engine evaluated ${cycles.length} active cycle(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
