import { getReportOverview } from "@/src/application/reporting/get-report-overview";
import { csvDownload, safeFilename, toCsv } from "@/src/application/exporting/csv";

export const dynamic = "force-dynamic";

function rangeDate(raw: string | null, end = false): Date | undefined {
  if (!raw) return undefined;
  const value = new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}+07:00`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const report = await getReportOverview({
    from: rangeDate(url.searchParams.get("from")),
    to: rangeDate(url.searchParams.get("to"), true),
  });
  if (!report) return new Response("Farm tidak ditemukan", { status: 404 });

  const rows: unknown[][] = [
    ["section", "metric", "value", "unit"],
    ["production", "active_cycles", report.production.activeCycles, "cycle"],
    ["production", "completed_cycles", report.production.completedCycles, "cycle"],
    ["production", "harvested", report.production.harvestedKg, "kg"],
    ["production", "cost_period", report.production.cost, "IDR"],
    ["production", "harvest_revenue_period", report.production.revenue, "IDR"],
    ["production", "revenue_minus_cost_period", report.production.profit, "IDR"],
    ["production", "final_margin", report.production.marginPct ?? "", "%"],
    ["commercial", "customers", report.commercial.customers, "customer"],
    ["commercial", "open_opportunities", report.commercial.openOpportunities, "opportunity"],
    ["commercial", "pipeline", report.commercial.pipelineValue, "IDR"],
    ["commercial", "orders", report.commercial.orders, "order"],
    ["commercial", "order_qty", report.commercial.orderKg, "kg"],
    ["commercial", "order_value", report.commercial.orderValue, "IDR"],
    ["commercial", "delivered", report.commercial.deliveredKg, "kg"],
    ["commercial", "invoiced", report.commercial.invoicedAmount, "IDR"],
    ["commercial", "collected", report.commercial.collectedAmount, "IDR"],
    ["commercial", "outstanding", report.commercial.outstandingAmount, "IDR"],
    ["commercial", "collection_rate", report.commercial.collectionRatePct ?? "", "%"],
    [],
    ["trend_month", "production_cost", "harvest_kg", "production_revenue", "order_value", "collected"],
    ...report.trend.map((row) => [row.key, row.cost, row.harvestKg, row.revenue, row.orderValue, row.collected]),
    [],
    ["customer", "orders", "quantity_kg", "order_value", "collected"],
    ...report.topCustomers.map((row) => [row.customerName, row.orderCount, row.quantityKg, row.orderValue, row.collectedAmount]),
  ];

  return csvDownload(toCsv(rows), `${safeFilename(report.farmName)}-laporan.csv`);
}
