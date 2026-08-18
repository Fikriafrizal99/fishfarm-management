import { AppFrame } from "@/app/_components/app-frame";
import { UtilityWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getReportOverview } from "@/src/application/reporting/get-report-overview";

export const dynamic = "force-dynamic";
const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const number2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
function rangeDate(raw: string | undefined, end = false): Date | undefined { if (!raw) return undefined; const value = new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}+07:00`); return Number.isNaN(value.getTime()) ? undefined : value; }
function monthName(key: string): string { return monthLabel.format(new Date(`${key}-01T12:00:00+07:00`)); }
function pct(value: number | null): string { return value === null ? "—" : `${number1.format(value)}%`; }
function width(value: number, max: number): string { return `${max <= 0 ? 0 : Math.max(2, (value / max) * 100)}%`; }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const range = { from: rangeDate(params.from), to: rangeDate(params.to, true) };
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let report: Awaited<ReturnType<typeof getReportOverview>> = null;
  let databaseError = false;
  try { [shell, report] = await Promise.all([getAppShellContext(), getReportOverview(range)]); } catch { databaseError = true; }
  const trend = report?.trend ?? [];
  const maxProductionMoney = Math.max(0, ...trend.flatMap((row) => [row.revenue, row.cost]));
  const maxCommercialMoney = Math.max(0, ...trend.flatMap((row) => [row.orderValue, row.collected]));

  return (
    <AppFrame active="lainnya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUSINESS PERFORMANCE</p><h1>Laporan</h1><p>Performa produksi dan komersial dalam satu periode, dengan current snapshot untuk pipeline dan piutang.</p></div></div>
        <UtilityWorkspaceNav active="reports" />
        <form className="reportFilterBar" method="get"><div><label><span>Dari</span><input type="date" name="from" defaultValue={params.from ?? ""} /></label><label><span>Sampai</span><input type="date" name="to" defaultValue={params.to ?? ""} /></label></div><div><a href="/reports">Semua data</a><button type="submit">Terapkan periode</button></div></form>
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <section className="reportExecutiveStrip">
          <article><span>Total Panen</span><strong>{number1.format(report?.production.harvestedKg ?? 0)} kg</strong><small>realisasi periode</small></article>
          <article><span>Biaya Produksi</span><strong>{currency.format(report?.production.cost ?? 0)}</strong><small>expense periode</small></article>
          <article><span>Order Value</span><strong>{currency.format(report?.commercial.orderValue ?? 0)}</strong><small>order periode</small></article>
          <article><span>Collected</span><strong>{currency.format(report?.commercial.collectedAmount ?? 0)}</strong><small>payment periode</small></article>
        </section>

        <section className="reportSection"><div className="reportSectionHeading"><div><p className="eyebrow dark">PRODUCTION</p><h2>Performa Budidaya</h2></div><span>Observed + actual, tidak mencampur profit aktif sebagai kerugian final.</span></div>
          <div className="reportSummaryLine"><div><span>Siklus Aktif</span><strong>{number0.format(report?.production.activeCycles ?? 0)}</strong></div><div><span>Siklus Selesai</span><strong>{number0.format(report?.production.completedCycles ?? 0)}</strong></div><div><span>Revenue Panen</span><strong>{currency.format(report?.production.revenue ?? 0)}</strong></div><div><span>Net Produksi Periode</span><strong className={(report?.production.profit ?? 0) >= 0 ? "goodText" : "warningText"}>{currency.format(report?.production.profit ?? 0)}</strong></div><div><span>Margin</span><strong>{pct(report?.production.marginPct ?? null)}</strong></div></div>

          <div className="reportVisualGrid"><div className="workspaceCard reportTrendCard"><div className="sectionHeaderInline"><h3>Trend Revenue vs Biaya</h3><span className="mutedInline">per bulan</span></div><div className="trendBarList">{trend.map((row) => <div className="trendBarRow" key={row.key}><strong>{monthName(row.key)}</strong><div className="trendBars"><div><span>Revenue</span><i className="bar revenue" style={{ width: width(row.revenue, maxProductionMoney) }} /><b>{currency.format(row.revenue)}</b></div><div><span>Biaya</span><i className="bar cost" style={{ width: width(row.cost, maxProductionMoney) }} /><b>{currency.format(row.cost)}</b></div></div></div>)}{trend.length === 0 ? <div className="recordEmpty">Belum ada event pada periode ini.</div> : null}</div></div>
            <div className="workspaceCard reportTrendCard"><div className="sectionHeaderInline"><h3>Panen per Bulan</h3><span className="mutedInline">kg</span></div><div className="harvestColumnChart">{trend.map((row) => { const max = Math.max(0, ...trend.map((item) => item.harvestKg)); return <div key={row.key}><div className="harvestColumnTrack"><i style={{ height: width(row.harvestKg, max) }} /></div><strong>{number1.format(row.harvestKg)}</strong><span>{monthName(row.key)}</span></div>; })}{trend.length === 0 ? <div className="recordEmpty">Belum ada panen.</div> : null}</div></div></div>

          <div className="workspaceCard comparisonCard"><div className="sectionHeaderInline"><h3>Perbandingan Siklus Aktif</h3><span className="mutedInline">current snapshot</span></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Kolam</th><th>SR / Target</th><th>FCR / Target</th><th>ABW</th><th>Biomassa</th><th>Biaya Berjalan</th><th>Status</th></tr></thead><tbody>{(report?.cycleComparison ?? []).map((cycle) => <tr key={cycle.cycleId}><td><strong>{cycle.pondCode}</strong><br /><small>{cycle.species}</small></td><td>{cycle.survivalRatePct === null ? "—" : `${number1.format(cycle.survivalRatePct)}%`} <small>/ {cycle.targetSrPct === null ? "—" : `${number1.format(cycle.targetSrPct)}%`}</small></td><td>{cycle.fcr === null ? "—" : number2.format(cycle.fcr)} <small>/ {cycle.targetFcr === null ? "—" : number2.format(cycle.targetFcr)}</small></td><td>{cycle.averageWeightG === null ? "—" : `${number0.format(cycle.averageWeightG)} g`}</td><td>{cycle.estimatedBiomassKg === null ? "—" : `${number1.format(cycle.estimatedBiomassKg)} kg`}</td><td>{currency.format(cycle.runningCost)}</td><td><span className={`statusBadge ${cycle.status === "ON_TARGET" ? "good" : "warning"}`}>{cycle.status.replaceAll("_", " ")}</span></td></tr>)}{(report?.cycleComparison.length ?? 0) === 0 ? <tr><td colSpan={7}>Tidak ada siklus aktif.</td></tr> : null}</tbody></table></div></div>
        </section>

        <section className="reportSection"><div className="reportSectionHeading"><div><p className="eyebrow dark">COMMERCIAL</p><h2>Penjualan & Collection</h2></div><span>Pipeline dan piutang adalah current snapshot; transaksi lainnya mengikuti periode.</span></div>
          <div className="reportSummaryLine"><div><span>Customer</span><strong>{number0.format(report?.commercial.customers ?? 0)}</strong></div><div><span>Open Opportunity</span><strong>{number0.format(report?.commercial.openOpportunities ?? 0)}</strong></div><div><span>Pipeline</span><strong>{currency.format(report?.commercial.pipelineValue ?? 0)}</strong></div><div><span>Delivered</span><strong>{number1.format(report?.commercial.deliveredKg ?? 0)} kg</strong></div><div><span>Piutang Current</span><strong className="warningText">{currency.format(report?.commercial.outstandingAmount ?? 0)}</strong></div><div><span>Collection Rate</span><strong>{pct(report?.commercial.collectionRatePct ?? null)}</strong></div></div>
          <div className="workspaceCard reportTrendCard"><div className="sectionHeaderInline"><h3>Order vs Collection</h3><span className="mutedInline">per bulan</span></div><div className="trendBarList">{trend.map((row) => <div className="trendBarRow" key={row.key}><strong>{monthName(row.key)}</strong><div className="trendBars"><div><span>Order</span><i className="bar order" style={{ width: width(row.orderValue, maxCommercialMoney) }} /><b>{currency.format(row.orderValue)}</b></div><div><span>Collected</span><i className="bar collected" style={{ width: width(row.collected, maxCommercialMoney) }} /><b>{currency.format(row.collected)}</b></div></div></div>)}{trend.length === 0 ? <div className="recordEmpty">Belum ada transaksi pada periode ini.</div> : null}</div></div>
        </section>

        <section className="reportSection"><div className="reportSectionHeading"><div><p className="eyebrow dark">CUSTOMERS</p><h2>Kontribusi Customer</h2></div><span>berdasarkan order pada periode</span></div><div className="workspaceCard comparisonCard"><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Customer</th><th>Order</th><th>Qty</th><th>Nilai Order</th><th>Kas Terkumpul</th><th>Collection / Order</th></tr></thead><tbody>{(report?.topCustomers ?? []).map((customer) => <tr key={customer.customerName}><td><strong>{customer.customerName}</strong></td><td>{number0.format(customer.orderCount)}</td><td>{number1.format(customer.quantityKg)} kg</td><td>{currency.format(customer.orderValue)}</td><td className="goodText strongCell">{currency.format(customer.collectedAmount)}</td><td>{customer.orderValue > 0 ? `${number1.format((customer.collectedAmount / customer.orderValue) * 100)}%` : "—"}</td></tr>)}{(report?.topCustomers.length ?? 0) === 0 ? <tr><td colSpan={6}>Belum ada data customer pada periode ini.</td></tr> : null}</tbody></table></div></div></section>
      </div>
    </AppFrame>
  );
}
