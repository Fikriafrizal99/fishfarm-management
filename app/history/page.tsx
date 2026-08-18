import { AppFrame } from "@/app/_components/app-frame";
import { UtilityWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getHistoryOverview } from "@/src/application/reporting/get-history-overview";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

function statusTone(status: string): string {
  if (["COMPLETED", "FULFILLED", "PAID"].includes(status)) return "good";
  if (["CANCELLED", "VOID", "LOST"].includes(status)) return "danger";
  return "warning";
}

export default async function HistoryPage() {
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getHistoryOverview>> = null;
  let databaseError = false;

  try {
    [shell, history] = await Promise.all([getAppShellContext(), getHistoryOverview()]);
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
            <p className="workspaceKicker">HISTORY & AUDIT</p>
            <h1>Riwayat</h1>
            <p>Jejak siklus produksi dan transaksi komersial dalam satu tempat.</p>
          </div>
        </div>

        <UtilityWorkspaceNav active="history" />
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">PRODUCTION</p><h2>Riwayat siklus</h2></div><span className="mutedInline">{history?.productionCycles.length ?? 0} siklus</span></div>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead><tr><th>Siklus</th><th>Status</th><th>Periode</th><th>Panen</th><th>Biaya</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {(history?.productionCycles ?? []).map((cycle) => (
                  <tr key={cycle.id}>
                    <td><strong>{cycle.pondCode}</strong><br /><small>{cycle.cycleCode} · {cycle.species}</small></td>
                    <td><span className={`statusBadge ${statusTone(cycle.status)}`}>{cycle.status}</span></td>
                    <td>{cycle.startedAt ? dateFormatter.format(cycle.startedAt) : "—"}<br /><small>{cycle.completedAt ? `selesai ${dateFormatter.format(cycle.completedAt)}` : "belum selesai"}</small></td>
                    <td>{number1.format(cycle.harvestedKg)} kg</td>
                    <td>{currency.format(cycle.totalCost)}</td>
                    <td>{currency.format(cycle.revenue)}</td>
                    <td className={cycle.profit >= 0 ? "goodText strongCell" : "warningText strongCell"}>{currency.format(cycle.profit)}</td>
                  </tr>
                ))}
                {(history?.productionCycles.length ?? 0) === 0 ? <tr><td colSpan={7}>Belum ada riwayat siklus.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">COMMERCIAL</p><h2>Riwayat order</h2></div><span className="mutedInline">{history?.salesOrders.length ?? 0} order</span></div>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Qty</th><th>Delivered</th><th>Nilai Order</th><th>Invoice</th><th>Dibayar</th><th>Piutang</th></tr></thead>
              <tbody>
                {(history?.salesOrders ?? []).map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.orderNumber}</strong><br /><small>{dateFormatter.format(order.orderDate)}</small></td>
                    <td>{order.customerName}</td>
                    <td><span className={`statusBadge ${statusTone(order.status)}`}>{order.status}</span></td>
                    <td>{number1.format(order.quantityKg)} kg</td>
                    <td>{number1.format(order.deliveredKg)} kg</td>
                    <td>{currency.format(order.orderValue)}</td>
                    <td>{currency.format(order.invoicedAmount)}</td>
                    <td className="goodText strongCell">{currency.format(order.paidAmount)}</td>
                    <td className={order.outstandingAmount > 0 ? "warningText strongCell" : "goodText strongCell"}>{currency.format(order.outstandingAmount)}</td>
                  </tr>
                ))}
                {(history?.salesOrders.length ?? 0) === 0 ? <tr><td colSpan={9}>Belum ada riwayat order.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
