import { getHistoryOverview } from "@/src/application/reporting/get-history-overview";
import { csvDownload, safeFilename, toCsv } from "@/src/application/exporting/csv";

export const dynamic = "force-dynamic";

function rangeDate(raw: string | null, end = false): Date | undefined {
  if (!raw) return undefined;
  const value = new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}+07:00`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const history = await getHistoryOverview({
    from: rangeDate(url.searchParams.get("from")),
    to: rangeDate(url.searchParams.get("to"), true),
  });
  if (!history) return new Response("Farm tidak ditemukan", { status: 404 });

  const rows: unknown[][] = [[
    "record_type", "reference", "entity", "status", "date_start", "date_end",
    "quantity_kg", "biomass_kg", "sr_pct", "fcr", "cost", "revenue",
    "profit", "order_value", "invoiced", "paid", "outstanding",
  ]];

  for (const cycle of history.activeCycles) {
    rows.push([
      "production_active", cycle.cycleCode, `${cycle.pondCode} - ${cycle.species}`, cycle.status,
      iso(cycle.startedAt), iso(cycle.targetHarvestDate), cycle.harvestedKg,
      cycle.estimatedBiomassKg ?? "", cycle.survivalRatePct ?? "", cycle.fcr ?? "",
      cycle.runningCost, "", "", "", "", "", "",
    ]);
  }

  for (const cycle of history.completedCycles) {
    rows.push([
      "production_completed", cycle.cycleCode, `${cycle.pondCode} - ${cycle.species}`, cycle.status,
      iso(cycle.startedAt), iso(cycle.completedAt), cycle.harvestedKg, "", "", "",
      cycle.totalCost, cycle.revenue, cycle.profit, "", "", "", "",
    ]);
  }

  for (const order of history.salesOrders) {
    rows.push([
      "sales_order", order.orderNumber, order.customerName, order.status,
      iso(order.orderDate), iso(order.requestedDeliveryDate), order.quantityKg, "", "", "",
      "", "", "", order.orderValue, order.invoicedAmount, order.paidAmount, order.outstandingAmount,
    ]);
  }

  return csvDownload(toCsv(rows), `${safeFilename(history.farmName)}-riwayat.csv`);
}
