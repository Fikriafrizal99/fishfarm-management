import { AppFrame } from "@/app/_components/app-frame";
import { UtilityWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getReportOverview } from "@/src/application/reporting/get-report-overview";

export const dynamic = "force-dynamic";

const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function marginPct(revenue: number, profit: number): string {
  if (revenue <= 0) return "—";
  return `${number1.format((profit / revenue) * 100)}%`;
}

export default async function ReportsPage() {
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let report: Awaited<ReturnType<typeof getReportOverview>> = null;
  let databaseError = false;

  try {
    [shell, report] = await Promise.all([getAppShellContext(), getReportOverview()]);
  } catch {
    databaseError = true;
  }

  return (
    <AppFrame
      active="lainnya"
      ownerName={shell?.ownerName ?? null}
      alertCount={shell?.openAlertCount ?? 0}
      activePonds={shell?.activePonds}
    >
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow">
          <div>
            <p className="workspaceKicker">BUSINESS PERFORMANCE</p>
            <h1>Laporan</h1>
            <p>Ringkasan performa produksi dan komersial dari source of truth yang sama.</p>
          </div>
        </div>

        <UtilityWorkspaceNav active="reports" />
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">PRODUCTION</p><h2>Ringkasan budidaya</h2></div></div>
          <div className="salesKpiGrid">
            <article><span>Total Siklus</span><strong>{number0.format(report?.production.totalCycles ?? 0)}</strong></article>
            <article><span>Siklus Selesai</span><strong>{number0.format(report?.production.completedCycles ?? 0)}</strong></article>
            <article><span>Total Panen</span><strong>{number1.format(report?.production.harvestedKg ?? 0)} kg</strong></article>
            <article><span>Total Biaya</span><strong>{currency.format(report?.production.cost ?? 0)}</strong></article>
            <article><span>Revenue Panen</span><strong>{currency.format(report?.production.revenue ?? 0)}</strong></article>
            <article><span>Profit Produksi</span><strong>{currency.format(report?.production.profit ?? 0)}</strong></article>
            <article><span>Margin Produksi</span><strong>{marginPct(report?.production.revenue ?? 0, report?.production.profit ?? 0)}</strong></article>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">COMMERCIAL</p><h2>Ringkasan penjualan</h2></div></div>
          <div className="salesKpiGrid">
            <article><span>Customer Aktif</span><strong>{number0.format(report?.commercial.customers ?? 0)}</strong></article>
            <article><span>Opportunity Open</span><strong>{number0.format(report?.commercial.openOpportunities ?? 0)}</strong></article>
            <article><span>Pipeline</span><strong>{currency.format(report?.commercial.pipelineValue ?? 0)}</strong></article>
            <article><span>Order</span><strong>{number0.format(report?.commercial.orders ?? 0)}</strong></article>
            <article><span>Order Qty</span><strong>{number1.format(report?.commercial.orderKg ?? 0)} kg</strong></article>
            <article><span>Delivered</span><strong>{number1.format(report?.commercial.deliveredKg ?? 0)} kg</strong></article>
            <article><span>Order Value</span><strong>{currency.format(report?.commercial.orderValue ?? 0)}</strong></article>
            <article><span>Invoiced</span><strong>{currency.format(report?.commercial.invoicedAmount ?? 0)}</strong></article>
            <article><span>Collected</span><strong>{currency.format(report?.commercial.collectedAmount ?? 0)}</strong></article>
            <article><span>Piutang</span><strong>{currency.format(report?.commercial.outstandingAmount ?? 0)}</strong></article>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">CUSTOMERS</p><h2>Kontribusi customer</h2></div><span className="mutedInline">berdasarkan nilai order</span></div>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead><tr><th>Customer</th><th>Order</th><th>Qty</th><th>Nilai Order</th><th>Kas Terkumpul</th><th>Collection Rate</th></tr></thead>
              <tbody>
                {(report?.topCustomers ?? []).map((customer) => (
                  <tr key={customer.customerName}>
                    <td><strong>{customer.customerName}</strong></td>
                    <td>{number0.format(customer.orderCount)}</td>
                    <td>{number1.format(customer.quantityKg)} kg</td>
                    <td>{currency.format(customer.orderValue)}</td>
                    <td className="goodText strongCell">{currency.format(customer.collectedAmount)}</td>
                    <td>{customer.orderValue > 0 ? `${number1.format((customer.collectedAmount / customer.orderValue) * 100)}%` : "—"}</td>
                  </tr>
                ))}
                {(report?.topCustomers.length ?? 0) === 0 ? <tr><td colSpan={6}>Belum ada data customer untuk dilaporkan.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
