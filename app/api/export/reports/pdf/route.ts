import { getReportOverview } from "@/src/application/reporting/get-report-overview";
import { createSimplePdf, pdfDownload } from "@/src/application/exporting/pdf-document";
import { safeFilename } from "@/src/application/exporting/csv";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function rangeDate(raw: string | null, end = false): Date | undefined {
  if (!raw) return undefined;
  const value = new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}+07:00`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

function pct(value: number | null): string {
  return value === null ? "-" : `${number1.format(value)}%`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const report = await getReportOverview({
    from: rangeDate(fromRaw),
    to: rangeDate(toRaw, true),
  });
  if (!report) return new Response("Farm tidak ditemukan", { status: 404 });

  const meta = [
    `Farm: ${report.farmName}`,
    `Periode: ${fromRaw || "awal data"} s.d. ${toRaw || "sekarang"}`,
  ];

  const sections = [
    {
      title: "Ringkasan Produksi",
      rows: [
        { label: "Siklus aktif", value: String(report.production.activeCycles) },
        { label: "Siklus selesai pada periode", value: String(report.production.completedCycles) },
        { label: "Total panen", value: `${number1.format(report.production.harvestedKg)} kg`, emphasis: true },
        { label: "Biaya produksi", value: currency.format(report.production.cost) },
        { label: "Revenue panen", value: currency.format(report.production.revenue) },
        { label: "Net produksi periode", value: currency.format(report.production.profit), emphasis: true },
        { label: "Margin produksi", value: pct(report.production.marginPct) },
      ],
    },
    {
      title: "Ringkasan Komersial",
      rows: [
        { label: "Customer aktif", value: String(report.commercial.customers) },
        { label: "Opportunity open", value: String(report.commercial.openOpportunities) },
        { label: "Pipeline", value: currency.format(report.commercial.pipelineValue) },
        { label: "Order", value: `${report.commercial.orders} order / ${number1.format(report.commercial.orderKg)} kg` },
        { label: "Order value", value: currency.format(report.commercial.orderValue), emphasis: true },
        { label: "Delivered", value: `${number1.format(report.commercial.deliveredKg)} kg` },
        { label: "Invoiced", value: currency.format(report.commercial.invoicedAmount) },
        { label: "Collected", value: currency.format(report.commercial.collectedAmount), emphasis: true },
        { label: "Piutang saat ini", value: currency.format(report.commercial.outstandingAmount) },
        { label: "Collection rate periode", value: pct(report.commercial.collectionRatePct) },
      ],
    },
    {
      title: "Perbandingan Siklus Aktif",
      rows: report.cycleComparison.length > 0
        ? report.cycleComparison.flatMap((cycle) => [
            { label: `${cycle.pondCode} - ${cycle.species}`, value: `${cycle.status} | SR ${pct(cycle.survivalRatePct)} / target ${pct(cycle.targetSrPct)} | FCR ${cycle.fcr === null ? "-" : number1.format(cycle.fcr)} / target ${cycle.targetFcr === null ? "-" : number1.format(cycle.targetFcr)}`, emphasis: true },
            { label: "Biomassa / biaya berjalan", value: `${cycle.estimatedBiomassKg === null ? "-" : `${number1.format(cycle.estimatedBiomassKg)} kg`} / ${currency.format(cycle.runningCost)}` },
          ])
        : [{ label: "Siklus", value: "Tidak ada siklus aktif" }],
    },
    {
      title: "Kontribusi Customer",
      rows: report.topCustomers.length > 0
        ? report.topCustomers.map((customer) => ({
            label: customer.customerName,
            value: `${customer.orderCount} order | ${number1.format(customer.quantityKg)} kg | order ${currency.format(customer.orderValue)} | collected ${currency.format(customer.collectedAmount)}`,
          }))
        : [{ label: "Customer", value: "Belum ada transaksi customer" }],
    },
  ];

  const bytes = await createSimplePdf({
    title: "Laporan Farm",
    subtitle: "Ringkasan performa produksi dan komersial",
    meta,
    sections,
    footer: "FishFarm Management - laporan dihasilkan dari transaksi PostgreSQL pada saat export.",
  });

  return pdfDownload(bytes, `${safeFilename(report.farmName)}-laporan.pdf`);
}
