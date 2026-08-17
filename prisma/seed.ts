import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AlertSeverity,
  AlertStatus,
  AllocationType,
  CycleStatus,
  ExpenseCategory,
  ExpenseSourceType,
  FarmRole,
  PondStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for database seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  farm: "00000000-0000-4000-8000-000000000010",
  speciesNila: "00000000-0000-4000-8000-000000000020",
  pond1: "00000000-0000-4000-8000-000000000101",
  pond2: "00000000-0000-4000-8000-000000000102",
  feed: "00000000-0000-4000-8000-000000000200",
  cycle1: "00000000-0000-4000-8000-000000001001",
  cycle2: "00000000-0000-4000-8000-000000001002",
  stocking1: "00000000-0000-4000-8000-000000002001",
  stocking2: "00000000-0000-4000-8000-000000002002",
  treatment1: "00000000-0000-4000-8000-000000003001",
};

const feed1 = [
  ["00000000-0000-4000-8000-000000004001", "2026-06-20T01:00:00.000Z", 50],
  ["00000000-0000-4000-8000-000000004002", "2026-06-27T01:00:00.000Z", 70],
  ["00000000-0000-4000-8000-000000004003", "2026-07-04T01:00:00.000Z", 90],
  ["00000000-0000-4000-8000-000000004004", "2026-07-11T01:00:00.000Z", 110],
  ["00000000-0000-4000-8000-000000004005", "2026-07-18T01:00:00.000Z", 120],
  ["00000000-0000-4000-8000-000000004006", "2026-07-25T01:00:00.000Z", 125],
  ["00000000-0000-4000-8000-000000004007", "2026-08-01T01:00:00.000Z", 130],
  ["00000000-0000-4000-8000-000000004008", "2026-08-08T01:00:00.000Z", 121],
  ["00000000-0000-4000-8000-000000004009", "2026-08-16T01:00:00.000Z", 18],
] as const;

const mortality1 = [
  ["00000000-0000-4000-8000-000000005001", "2026-06-25T02:00:00.000Z", 50],
  ["00000000-0000-4000-8000-000000005002", "2026-07-10T02:00:00.000Z", 40],
  ["00000000-0000-4000-8000-000000005003", "2026-07-28T02:00:00.000Z", 46],
  ["00000000-0000-4000-8000-000000005004", "2026-08-12T02:00:00.000Z", 38],
] as const;

const samples1 = [
  ["00000000-0000-4000-8000-000000006001", "2026-06-20T03:00:00.000Z", 0.9, 30],
  ["00000000-0000-4000-8000-000000006002", "2026-07-01T03:00:00.000Z", 1.65, 55],
  ["00000000-0000-4000-8000-000000006003", "2026-07-12T03:00:00.000Z", 2.76, 92],
  ["00000000-0000-4000-8000-000000006004", "2026-07-23T03:00:00.000Z", 4.35, 145],
  ["00000000-0000-4000-8000-000000006005", "2026-08-05T03:00:00.000Z", 6.3, 210],
  ["00000000-0000-4000-8000-000000006006", "2026-08-17T03:00:00.000Z", 8.1, 270],
] as const;

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@fishfarm.local" },
    update: { name: "Fikri Dev" },
    create: { id: ids.user, email: "dev@fishfarm.local", name: "Fikri Dev" },
  });

  const farm = await prisma.farm.upsert({
    where: { id: ids.farm },
    update: {
      name: "FishFarm Development",
      locationText: "Cianjur, Jawa Barat",
      timezone: "Asia/Jakarta",
      currency: "IDR",
    },
    create: {
      id: ids.farm,
      name: "FishFarm Development",
      locationText: "Cianjur, Jawa Barat",
      timezone: "Asia/Jakarta",
      currency: "IDR",
    },
  });

  await prisma.farmMembership.upsert({
    where: { userId_farmId: { userId: user.id, farmId: farm.id } },
    update: { role: FarmRole.OWNER },
    create: { userId: user.id, farmId: farm.id, role: FarmRole.OWNER },
  });

  const nila = await prisma.species.upsert({
    where: { commonName: "Nila" },
    update: { scientificName: "Oreochromis niloticus", active: true },
    create: {
      id: ids.speciesNila,
      commonName: "Nila",
      scientificName: "Oreochromis niloticus",
      active: true,
    },
  });

  const pond1 = await prisma.pond.upsert({
    where: { farmId_code: { farmId: farm.id, code: "KLM-001" } },
    update: { status: PondStatus.ACTIVE },
    create: {
      id: ids.pond1,
      farmId: farm.id,
      code: "KLM-001",
      name: "Kolam Nila 1",
      pondType: "Terpal",
      lengthM: 4,
      widthM: 6,
      depthM: 1.2,
      status: PondStatus.ACTIVE,
    },
  });

  const pond2 = await prisma.pond.upsert({
    where: { farmId_code: { farmId: farm.id, code: "KLM-002" } },
    update: { status: PondStatus.ACTIVE },
    create: {
      id: ids.pond2,
      farmId: farm.id,
      code: "KLM-002",
      name: "Kolam Nila 2",
      pondType: "Terpal",
      lengthM: 4,
      widthM: 6,
      depthM: 1.2,
      status: PondStatus.ACTIVE,
    },
  });

  const feedType = await prisma.feedType.upsert({
    where: { id: ids.feed },
    update: { defaultUnitCost: 10132, active: true },
    create: {
      id: ids.feed,
      farmId: farm.id,
      name: "Grower 30%",
      brand: "Development Feed",
      proteinPct: 30,
      defaultUnitCost: 10132,
      active: true,
    },
  });

  const cycle1 = await prisma.productionCycle.upsert({
    where: { farmId_cycleCode: { farmId: farm.id, cycleCode: "KLM-001-2026-01" } },
    update: { status: CycleStatus.ACTIVE },
    create: {
      id: ids.cycle1,
      farmId: farm.id,
      pondId: pond1.id,
      speciesId: nila.id,
      cycleCode: "KLM-001-2026-01",
      status: CycleStatus.ACTIVE,
      startedAt: new Date("2026-06-15T00:00:00.000Z"),
      targetHarvestDate: new Date("2026-09-14T00:00:00.000Z"),
      targetSrPct: 90,
      targetFcr: 1.2,
      targetHarvestWeightKg: 750,
      targetHppPerKg: 16000,
      targetSellingPricePerKg: 23000,
    },
  });

  const cycle2 = await prisma.productionCycle.upsert({
    where: { farmId_cycleCode: { farmId: farm.id, cycleCode: "KLM-002-2026-01" } },
    update: { status: CycleStatus.ACTIVE },
    create: {
      id: ids.cycle2,
      farmId: farm.id,
      pondId: pond2.id,
      speciesId: nila.id,
      cycleCode: "KLM-002-2026-01",
      status: CycleStatus.ACTIVE,
      startedAt: new Date("2026-06-18T00:00:00.000Z"),
      targetHarvestDate: new Date("2026-09-17T00:00:00.000Z"),
      targetSrPct: 90,
      targetFcr: 1.3,
      targetHarvestWeightKg: 650,
      targetHppPerKg: 16500,
      targetSellingPricePerKg: 23000,
    },
  });

  await prisma.stocking.upsert({
    where: { id: ids.stocking1 },
    update: {},
    create: {
      id: ids.stocking1,
      cycleId: cycle1.id,
      eventDate: new Date("2026-06-15T00:00:00.000Z"),
      quantity: 3000,
      avgWeightG: 10,
      seedCostPerUnit: 750,
      totalSeedCost: 2250000,
      supplier: "Supplier Benih Development",
      createdById: user.id,
    },
  });

  await prisma.stocking.upsert({
    where: { id: ids.stocking2 },
    update: {},
    create: {
      id: ids.stocking2,
      cycleId: cycle2.id,
      eventDate: new Date("2026-06-18T00:00:00.000Z"),
      quantity: 2500,
      avgWeightG: 10,
      seedCostPerUnit: 750,
      totalSeedCost: 1875000,
      supplier: "Supplier Benih Development",
      createdById: user.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: "00000000-0000-4000-8000-000000007001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000007001",
      farmId: farm.id,
      pondId: pond1.id,
      cycleId: cycle1.id,
      expenseDate: new Date("2026-06-15T00:00:00.000Z"),
      category: ExpenseCategory.SEED,
      description: "Benih Nila KLM-001",
      amount: 2250000,
      allocationType: AllocationType.DIRECT,
      sourceType: ExpenseSourceType.STOCKING,
      sourceId: ids.stocking1,
      createdById: user.id,
    },
  });

  for (const [id, eventAt, quantityKg] of feed1) {
    await prisma.feedingLog.upsert({
      where: { id },
      update: {},
      create: {
        id,
        cycleId: cycle1.id,
        feedTypeId: feedType.id,
        eventAt: new Date(eventAt),
        quantityKg,
        unitCostPerKg: 10132,
        notes: "Development seed feed record",
        createdById: user.id,
      },
    });

    await prisma.expense.upsert({
      where: { farmId_sourceType_sourceId: { farmId: farm.id, sourceType: ExpenseSourceType.FEEDING, sourceId: id } },
      update: {},
      create: {
        farmId: farm.id,
        pondId: pond1.id,
        cycleId: cycle1.id,
        expenseDate: new Date(eventAt),
        category: ExpenseCategory.FEED,
        description: `Pakan KLM-001 ${quantityKg} kg`,
        amount: quantityKg * 10132,
        allocationType: AllocationType.DIRECT,
        sourceType: ExpenseSourceType.FEEDING,
        sourceId: id,
        createdById: user.id,
      },
    });
  }

  for (const [id, eventAt, quantity] of mortality1) {
    await prisma.mortalityLog.upsert({
      where: { id },
      update: {},
      create: {
        id,
        cycleId: cycle1.id,
        eventAt: new Date(eventAt),
        quantity,
        suspectedCause: "Mortalitas rutin / belum terdiagnosis",
        createdById: user.id,
      },
    });
  }

  for (const [id, sampledAt, totalKg, avgG] of samples1) {
    await prisma.samplingLog.upsert({
      where: { id },
      update: {},
      create: {
        id,
        cycleId: cycle1.id,
        sampledAt: new Date(sampledAt),
        sampleCount: 30,
        totalSampleWeightKg: totalKg,
        averageWeightG: avgG,
        createdById: user.id,
      },
    });
  }

  await prisma.treatmentLog.upsert({
    where: { id: ids.treatment1 },
    update: {},
    create: {
      id: ids.treatment1,
      cycleId: cycle1.id,
      eventAt: new Date("2026-07-20T02:00:00.000Z"),
      treatmentType: "PROBIOTIC",
      productName: "Probiotik Development",
      quantity: 1,
      unit: "paket",
      costAmount: 420000,
      reason: "Pemeliharaan kualitas air",
      createdById: user.id,
    },
  });

  await prisma.expense.upsert({
    where: { farmId_sourceType_sourceId: { farmId: farm.id, sourceType: ExpenseSourceType.TREATMENT, sourceId: ids.treatment1 } },
    update: {},
    create: {
      farmId: farm.id,
      pondId: pond1.id,
      cycleId: cycle1.id,
      expenseDate: new Date("2026-07-20T00:00:00.000Z"),
      category: ExpenseCategory.PROBIOTIC,
      description: "Probiotik KLM-001",
      amount: 420000,
      allocationType: AllocationType.DIRECT,
      sourceType: ExpenseSourceType.TREATMENT,
      sourceId: ids.treatment1,
      createdById: user.id,
    },
  });

  const manualExpenses = [
    ["00000000-0000-4000-8000-000000007010", ExpenseCategory.ELECTRICITY, "Listrik siklus KLM-001", 550000, "2026-08-01T00:00:00.000Z"],
    ["00000000-0000-4000-8000-000000007011", ExpenseCategory.LABOR, "Tenaga kerja KLM-001", 1500000, "2026-08-01T00:00:00.000Z"],
    ["00000000-0000-4000-8000-000000007012", ExpenseCategory.OTHER, "Biaya operasional lain KLM-001", 380000, "2026-08-01T00:00:00.000Z"],
  ] as const;

  for (const [id, category, description, amount, date] of manualExpenses) {
    await prisma.expense.upsert({
      where: { id },
      update: {},
      create: {
        id,
        farmId: farm.id,
        pondId: pond1.id,
        cycleId: cycle1.id,
        expenseDate: new Date(date),
        category,
        description,
        amount,
        allocationType: AllocationType.DIRECT,
        sourceType: ExpenseSourceType.MANUAL,
        createdById: user.id,
      },
    });
  }

  const feed2Id = "00000000-0000-4000-8000-000000004101";
  await prisma.feedingLog.upsert({
    where: { id: feed2Id },
    update: {},
    create: {
      id: feed2Id,
      cycleId: cycle2.id,
      feedTypeId: feedType.id,
      eventAt: new Date("2026-08-16T01:00:00.000Z"),
      quantityKg: 613,
      unitCostPerKg: 10132,
      notes: "Aggregated development record for KLM-002",
      createdById: user.id,
    },
  });

  await prisma.mortalityLog.upsert({
    where: { id: "00000000-0000-4000-8000-000000005101" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000005101",
      cycleId: cycle2.id,
      eventAt: new Date("2026-08-16T02:00:00.000Z"),
      quantity: 325,
      suspectedCause: "Needs investigation",
      createdById: user.id,
    },
  });

  await prisma.samplingLog.upsert({
    where: { id: "00000000-0000-4000-8000-000000006101" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000006101",
      cycleId: cycle2.id,
      sampledAt: new Date("2026-08-17T03:00:00.000Z"),
      sampleCount: 30,
      totalSampleWeightKg: 6.3,
      averageWeightG: 210,
      createdById: user.id,
    },
  });

  await prisma.alert.upsert({
    where: { id: "00000000-0000-4000-8000-000000008001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000008001",
      cycleId: cycle1.id,
      ruleCode: "CYCLE_ON_TARGET",
      severity: AlertSeverity.INFO,
      status: AlertStatus.OPEN,
      title: "Kolam berada dalam target",
      message: "KLM-001 memiliki survival rate sekitar 94,2% dan FCR sekitar 1,14 berdasarkan data seed.",
      recommendedAction: "Lanjutkan monitoring harian dan sampling berkala.",
      triggeredAt: new Date("2026-08-17T04:00:00.000Z"),
      ruleVersion: "dev-seed-v1",
    },
  });

  await prisma.alert.upsert({
    where: { id: "00000000-0000-4000-8000-000000008002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000008002",
      cycleId: cycle2.id,
      ruleCode: "FCR_HIGH",
      severity: AlertSeverity.ACTION_REQUIRED,
      status: AlertStatus.OPEN,
      title: "FCR perlu perhatian",
      message: "KLM-002 memiliki estimasi FCR sekitar 1,42, di atas target 1,30.",
      metricName: "fcr",
      metricValue: 1.42,
      thresholdValue: 1.3,
      recommendedAction: "Periksa feeding rate, kualitas air, dan kondisi ikan sebelum menambah pakan.",
      triggeredAt: new Date("2026-08-17T04:00:00.000Z"),
      ruleVersion: "dev-seed-v1",
    },
  });

  console.log("Development database seeded successfully.");
  console.log({ farm: farm.name, ponds: [pond1.code, pond2.code], cycles: [cycle1.cycleCode, cycle2.cycleCode] });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
