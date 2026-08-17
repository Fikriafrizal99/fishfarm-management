import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AllocationType,
  ExpenseCategory,
  ExpenseSourceType,
  PrismaClient,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database seeding");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const FARM_ID = "00000000-0000-4000-8000-000000000010";
const POND_ID = "00000000-0000-4000-8000-000000000102";
const CYCLE_ID = "00000000-0000-4000-8000-000000001002";
const STOCKING_ID = "00000000-0000-4000-8000-000000002002";
const FEEDING_ID = "00000000-0000-4000-8000-000000004101";
const USER_ID = "00000000-0000-4000-8000-000000000001";

async function main() {
  await prisma.expense.upsert({
    where: {
      farmId_sourceType_sourceId: {
        farmId: FARM_ID,
        sourceType: ExpenseSourceType.STOCKING,
        sourceId: STOCKING_ID,
      },
    },
    update: {},
    create: {
      farmId: FARM_ID,
      pondId: POND_ID,
      cycleId: CYCLE_ID,
      expenseDate: new Date("2026-06-18T00:00:00.000Z"),
      category: ExpenseCategory.SEED,
      description: "Benih Nila KLM-002",
      amount: 1_875_000,
      allocationType: AllocationType.DIRECT,
      sourceType: ExpenseSourceType.STOCKING,
      sourceId: STOCKING_ID,
      createdById: USER_ID,
    },
  });

  await prisma.expense.upsert({
    where: {
      farmId_sourceType_sourceId: {
        farmId: FARM_ID,
        sourceType: ExpenseSourceType.FEEDING,
        sourceId: FEEDING_ID,
      },
    },
    update: {},
    create: {
      farmId: FARM_ID,
      pondId: POND_ID,
      cycleId: CYCLE_ID,
      expenseDate: new Date("2026-08-16T00:00:00.000Z"),
      category: ExpenseCategory.FEED,
      description: "Pakan KLM-002 613 kg",
      amount: 613 * 10_132,
      allocationType: AllocationType.DIRECT,
      sourceType: ExpenseSourceType.FEEDING,
      sourceId: FEEDING_ID,
      createdById: USER_ID,
    },
  });

  console.log("KLM-002 development finance ledger completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
