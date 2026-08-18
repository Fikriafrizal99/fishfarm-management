import { db } from "@/src/lib/db";
import { createSimplePdf, pdfDownload } from "@/src/application/exporting/pdf-document";
import { safeFilename } from "@/src/application/exporting/csv";
import { calculateEstimatedBiomassKg, calculateEstimatedPopulation, calculateSurvivalRatePct } from "@/src/domain/kpi/biology";
import { calculateBiomassGainKg, calculateFcr } from "@/src/domain/kpi/growth";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const number2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function n(value: unknown): number { return value === null || value === undefined ? 0 : Number(value); }
function pct(value: number | null): string { return value === null ? "-" : `${number1.format(value)}%`; }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cycleId: string }> },
): Promise<Response> {
  const { cycleId } = await params;
  const cycle = await db.productionCycle.findUnique({
    where: { id: cycleId },
    include: {
      farm: true,
      pond: true,
      species: true,
      stockings: { orderBy: { eventDate: "asc" } },
      mortalityLogs: true,
      feedingLogs: true,
      samplingLogs: { orderBy: { sampledAt: "asc" } },
      expenses: true,
      harvests: true,
    },
  });
  if (!cycle) return new Response("Siklus tidak ditemukan", { status: 404 });

  const stocked = cycle.stockings.reduce((sum, row) => sum + row.quantity, 0);
  const mortality = cycle.mortalityLogs.reduce((sum, row) => sum + row.quantity, 0);
  const harvestedFish = cycle.harvests.reduce((sum, row) => sum + (row.fishCount ?? 0), 0);
  const estimatedPopulation = calculateEstimatedPopulation(stocked, mortality, harvestedFish);
  const sr = calculateSurvivalRatePct(estimatedPopulation, stocked);
  const latestSample = cycle.samplingLogs.at(-1);
  const abw = latestSample?.averageWeightG === null || latestSample?.averageWeightG === undefined ? null : Number(latestSample.averageWeightG);
  const standingBiomass = abw === null ? null : calculateEstimatedBiomassKg(estimatedPopulation, abw);
  const feedKg = cycle.feedingLogs.reduce((sum, row) => sum + n(row.quantityKg), 0);
  const initialBiomass = cycle.stockings.reduce((sum, row) => sum + row.quantity * n(row.avgWeightG) / 1000, 0);
  const harvestedKg = cycle.harvests.reduce((sum, row) => sum + n(row.weightKg), 0);
  const revenue = cycle.harvests.reduce((sum, row) => sum + n(row.revenueAmount), 0);
  const cost = cycle.expenses.reduce((sum, row) => sum + n(row.amount), 0);
  const isCompleted = cycle.status === "COMPLETED";

  const activeBiomassGain = standingBiomass === null
    ? null
    : calculateBiomassGainKg({
        standingBiomassKg: standingBiomass,
        harvestedBiomassKg: harvestedKg,
        initialBiomassKg: initialBiomass,
      });
  const finalBiomassGain = harvestedKg - initialBiomass;
  const fcr = isCompleted
    ? calculateFcr(feedKg, finalBiomassGain)
    : activeBiomassGain === null ? null : calculateFcr(feedKg, activeBiomassGain);

  const actualHpp = isCompleted && harvestedKg > 0 ? cost / harvestedKg : null;
  const profit = isCompleted ? revenue - cost : null;
  const margin = isCompleted && revenue > 0 && profit !== null ? (profit / revenue) * 100 : null;

  const sections = [
    {
      title: "Identitas Siklus",
      rows: [
        { label: "Farm", value: cycle.farm.name },
        { label: "Kolam", value: `${cycle.pond.code} - ${cycle.pond.name ?? "Tanpa nama"}` },
        { label: "Species", value: cycle.species.commonName },
        { label: "Kode siklus", value: cycle.cycleCode, emphasis: true },
        { label: "Status", value: cycle.status },
        { label: "Mulai", value: cycle.startedAt ? date.format(cycle.startedAt) : "-" },
        { label: "Target panen", value: cycle.targetHarvestDate ? date.format(cycle.targetHarvestDate) : "-" },
        { label: "Selesai", value: cycle.completedAt ? date.format(cycle.completedAt) : "-" },
      ],
    },
    {
      title: "Biologi dan Produksi",
      rows: [
        { label: "Ikan tebar", value: `${stocked} ekor` },
        { label: "Mortalitas kumulatif", value: `${mortality} ekor` },
        { label: isCompleted ? "Populasi tersisa" : "Estimasi hidup", value: `${estimatedPopulation} ekor` },
        { label: "SR", value: pct(sr), emphasis: true },
        { label: "Target SR", value: cycle.targetSrPct === null ? "-" : `${number1.format(Number(cycle.targetSrPct))}%` },
        { label: "ABW terakhir", value: abw === null ? "-" : `${number1.format(abw)} g` },
        { label: "Estimasi biomassa berdiri", value: isCompleted ? "- (siklus selesai)" : standingBiomass === null ? "-" : `${number1.format(standingBiomass)} kg` },
        { label: "Pakan kumulatif", value: `${number1.format(feedKg)} kg` },
        { label: isCompleted ? "Final FCR" : "FCR berjalan", value: fcr === null ? "-" : number2.format(fcr), emphasis: true },
        { label: "Target FCR", value: cycle.targetFcr === null ? "-" : number2.format(Number(cycle.targetFcr)) },
        { label: "Total panen", value: `${number1.format(harvestedKg)} kg` },
      ],
    },
    {
      title: isCompleted ? "Hasil Finansial Aktual" : "Finansial Berjalan",
      rows: isCompleted ? [
        { label: "Total biaya", value: currency.format(cost) },
        { label: "Revenue panen", value: currency.format(revenue) },
        { label: "Actual HPP / kg", value: actualHpp === null ? "-" : currency.format(actualHpp), emphasis: true },
        { label: "Profit", value: profit === null ? "-" : currency.format(profit), emphasis: true },
        { label: "Margin", value: margin === null ? "-" : `${number1.format(margin)}%` },
      ] : [
        { label: "Biaya berjalan", value: currency.format(cost), emphasis: true },
        { label: "Target HPP / kg", value: cycle.targetHppPerKg === null ? "-" : currency.format(Number(cycle.targetHppPerKg)) },
        { label: "Target harga jual / kg", value: cycle.targetSellingPricePerKg === null ? "-" : currency.format(Number(cycle.targetSellingPricePerKg)) },
        { label: "Catatan", value: "Profit/HPP aktual tidak ditampilkan sebelum siklus COMPLETED." },
      ],
    },
  ];

  const bytes = await createSimplePdf({
    title: `Laporan Siklus ${cycle.cycleCode}`,
    subtitle: `${cycle.pond.code} - ${cycle.species.commonName}`,
    meta: [`Generated: ${date.format(new Date())}`],
    sections,
    footer: "Observed, estimated, dan actual-final dipisahkan sesuai status siklus.",
  });

  return pdfDownload(bytes, `${safeFilename(cycle.cycleCode)}-laporan-siklus.pdf`);
}
