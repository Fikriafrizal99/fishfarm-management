import { db } from "@/src/lib/db";
import { csvDownload, toCsv } from "@/src/application/exporting/csv";

export const dynamic = "force-dynamic";

function iso(value: Date | null | undefined): string { return value ? value.toISOString() : ""; }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await params;
  const farm = await db.farm.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!farm) return new Response("Farm tidak ditemukan", { status: 404 });

  if (kind === "sampling") {
    const rows = await db.samplingLog.findMany({
      where: { cycle: { farmId: farm.id } },
      include: { cycle: { include: { pond: true, species: true } } },
      orderBy: { sampledAt: "desc" },
    });
    return csvDownload(toCsv([
      ["date", "cycle", "pond", "species", "sample_count", "total_weight_kg", "average_weight_g", "average_length_cm", "observed_population", "notes"],
      ...rows.map((row) => [iso(row.sampledAt), row.cycle.cycleCode, row.cycle.pond.code, row.cycle.species.commonName, row.sampleCount, row.totalSampleWeightKg ?? "", row.averageWeightG ?? "", row.averageLengthCm ?? "", row.observedPopulation ?? "", row.notes ?? ""]),
    ]), "fishfarm-sampling.csv");
  }

  if (kind === "expenses") {
    const rows = await db.expense.findMany({
      where: { farmId: farm.id },
      include: { pond: true, cycle: true },
      orderBy: { expenseDate: "desc" },
    });
    return csvDownload(toCsv([
      ["date", "pond", "cycle", "category", "description", "amount", "allocation_type", "source_type", "notes"],
      ...rows.map((row) => [iso(row.expenseDate), row.pond?.code ?? "", row.cycle?.cycleCode ?? "", row.category, row.description, row.amount, row.allocationType, row.sourceType, row.notes ?? ""]),
    ]), "fishfarm-expenses.csv");
  }

  if (kind === "orders") {
    const orders = await db.salesOrder.findMany({
      where: { farmId: farm.id },
      include: { customer: true, items: { include: { species: true } } },
      orderBy: { orderDate: "desc" },
    });
    const rows: unknown[][] = [["order_number", "order_date", "customer", "status", "requested_delivery", "species", "quantity_kg", "unit_price", "line_value", "payment_terms", "notes"]];
    for (const order of orders) {
      for (const item of order.items) {
        rows.push([order.orderNumber, iso(order.orderDate), order.customer.name, order.status, iso(order.requestedDeliveryDate), item.species.commonName, item.quantityKg, item.unitPricePerKg, Number(item.quantityKg) * Number(item.unitPricePerKg), order.paymentTerms ?? "", order.notes ?? ""]);
      }
    }
    return csvDownload(toCsv(rows), "fishfarm-sales-orders.csv");
  }

  if (kind === "payments") {
    const rows = await db.payment.findMany({
      where: { invoice: { farmId: farm.id } },
      include: { invoice: { include: { salesOrder: { include: { customer: true } } } } },
      orderBy: { paidAt: "desc" },
    });
    return csvDownload(toCsv([
      ["paid_at", "invoice", "order", "customer", "amount", "method", "reference", "notes"],
      ...rows.map((row) => [iso(row.paidAt), row.invoice.invoiceNumber, row.invoice.salesOrder.orderNumber, row.invoice.salesOrder.customer.name, row.amount, row.method, row.reference ?? "", row.notes ?? ""]),
    ]), "fishfarm-payments.csv");
  }

  return new Response("Jenis export tidak dikenal", { status: 404 });
}
