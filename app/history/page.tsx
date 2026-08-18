import { AppFrame } from "@/app/_components/app-frame";
import { UtilityWorkspaceNav } from "@/app/_components/workspace-nav";
import { ExportMenu } from "@/app/_components/export-menu";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getHistoryOverview } from "@/src/application/reporting/get-history-overview";

export const dynamic = "force-dynamic";
const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const number2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function rangeDate(raw: string | undefined, end = false): Date | undefined { if (!raw) return undefined; const value = new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}+07:00`); return Number.isNaN(value.getTime()) ? undefined : value; }
function statusTone(status: string): string { if (["COMPLETED", "FULFILLED", "PAID"].includes(status)) return "good"; if (["CANCELLED", "VOID", "LOST"].includes(status)) return "danger"; return "warning"; }

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const range = { from: rangeDate(params.from), to: rangeDate(params.to, true) };
  const exportQuery = new URLSearchParams();
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  const historyExportHref = `/api/export/history${exportQuery.size ? `?${exportQuery.toString()}` : ""}`;

  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getHistoryOverview>> = null;
  let databaseError = false;
  try { [shell, history] = await Promise.all([getAppShellContext(), getHistoryOverview(range)]); } catch { databaseError = true; }

  return (
    <AppFrame active="lainnya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow">
          <div><p className="workspaceKicker">HISTORY & AUDIT</p><h1>Riwayat</h1><p>Siklus berjalan, hasil final, dan transaksi komersial tanpa mencampur estimasi dengan actual.</p></div>
          <div className="workspaceHeadingActions"><ExportMenu items={[{ label: "Riwayat CSV", href: historyExportHref }]} /></div>
        </div>
        <UtilityWorkspaceNav active="history" />
        <form className="reportFilterBar" method="get"><div><label><span>Dari</span><input type="date" name="from" defaultValue={params.from ?? ""} /></label><label><span>Sampai</span><input type="date" name="to" defaultValue={params.to ?? ""} /></label></div><div><a href="/history">Semua data</a><button type="submit">Terapkan periode</button></div></form>
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <section className="historySection"><div className="historySectionHeading"><div><p className="eyebrow dark">PRODUCTION · CURRENT</p><h2>Siklus Berjalan</h2><span>Selalu menampilkan state saat ini; filter periode tidak menyembunyikan siklus aktif.</span></div><b>{history?.activeCycles.length ?? 0}</b></div>
          <div className="activeCycleGrid">{(history?.activeCycles ?? []).map((cycle) => <article className="activeCycleCard" key={cycle.id}><header><div><strong>{cycle.pondCode} — {cycle.species}</strong><span>{cycle.cycleCode}</span></div><span className="statusBadge warning">{cycle.status}</span></header><div className="activeCycleMetrics"><div><span>SR</span><strong>{cycle.survivalRatePct === null ? "—" : `${number1.format(cycle.survivalRatePct)}%`}</strong></div><div><span>FCR</span><strong>{cycle.fcr === null ? "—" : number2.format(cycle.fcr)}</strong></div><div><span>ABW</span><strong>{cycle.averageWeightG === null ? "—" : `${number0.format(cycle.averageWeightG)} g`}</strong></div><div><span>Biomassa</span><strong>{cycle.estimatedBiomassKg === null ? "—" : `${number1.format(cycle.estimatedBiomassKg)} kg`}</strong></div></div><footer><span>Biaya berjalan <strong>{currency.format(cycle.runningCost)}</strong></span><span>Target panen <strong>{cycle.targetHarvestDate ? dateFormatter.format(cycle.targetHarvestDate) : "—"}</strong></span></footer></article>)}
          {(history?.activeCycles.length ?? 0) === 0 ? <div className="recordEmpty">Tidak ada siklus berjalan.</div> : null}</div>
        </section>

        <section className="historySection"><div className="historySectionHeading"><div><p className="eyebrow dark">PRODUCTION · ACTUAL</p><h2>Siklus Selesai</h2><span>Hanya siklus COMPLETED yang menampilkan actual HPP, revenue, profit, dan margin.</span></div><b>{history?.completedCycles.length ?? 0}</b></div>
          <div className="completedCycleList">{(history?.completedCycles ?? []).map((cycle) => <article className="completedCycleRow" key={cycle.id}><div className="completedIdentity"><strong>{cycle.pondCode} — {cycle.species}</strong><span>{cycle.cycleCode}</span><small>{cycle.completedAt ? `Selesai ${dateFormatter.format(cycle.completedAt)}` : "—"}</small></div><div><span>Panen</span><strong>{number1.format(cycle.harvestedKg)} kg</strong></div><div><span>Actual HPP</span><strong>{cycle.actualHppPerKg === null ? "—" : currency.format(cycle.actualHppPerKg)}</strong></div><div><span>Revenue</span><strong>{currency.format(cycle.revenue)}</strong></div><div><span>Profit</span><strong className={cycle.profit >= 0 ? "goodText" : "warningText"}>{currency.format(cycle.profit)}</strong></div><div><span>Margin</span><strong>{cycle.marginPct === null ? "—" : `${number1.format(cycle.marginPct)}%`}</strong></div></article>)}
          {(history?.completedCycles.length ?? 0) === 0 ? <div className="recordEmpty">Belum ada siklus selesai pada periode ini.</div> : null}</div>
        </section>

        <section className="historySection"><div className="historySectionHeading"><div><p className="eyebrow dark">COMMERCIAL LEDGER</p><h2>Riwayat Order</h2><span>Order → Delivery → Invoice → Payment dalam satu baris rekonsiliasi.</span></div><b>{history?.salesOrders.length ?? 0}</b></div>
          <div className="commercialHistoryList">{(history?.salesOrders ?? []).map((order) => <article className="commercialHistoryRow" key={order.id}><div><strong>{order.orderNumber}</strong><span>{order.customerName}</span><small>{dateFormatter.format(order.orderDate)}</small></div><div><span>Order</span><strong>{number1.format(order.quantityKg)} kg</strong><small>{currency.format(order.orderValue)}</small></div><div><span>Delivered</span><strong>{number1.format(order.deliveredKg)} kg</strong></div><div><span>Invoice</span><strong>{currency.format(order.invoicedAmount)}</strong></div><div><span>Dibayar</span><strong className="goodText">{currency.format(order.paidAmount)}</strong></div><div><span>Piutang</span><strong className={order.outstandingAmount > 0 ? "warningText" : "goodText"}>{currency.format(order.outstandingAmount)}</strong></div><span className={`statusBadge ${statusTone(order.status)}`}>{order.status}</span></article>)}
          {(history?.salesOrders.length ?? 0) === 0 ? <div className="recordEmpty">Belum ada order pada periode ini.</div> : null}</div>
        </section>
      </div>
    </AppFrame>
  );
}
