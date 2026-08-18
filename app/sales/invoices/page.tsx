import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { getInvoiceWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { submitInvoice, submitVoidInvoice } from "./actions";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getInvoiceWorkspace>> = { orders: [], invoices: [] };
  let databaseError = false;
  try {
    workspace = await getInvoiceWorkspace();
  } catch {
    databaseError = true;
  }

  const outstanding = workspace.invoices
    .filter((invoice) => !["PAID", "VOID"].includes(invoice.status))
    .reduce((sum, invoice) => {
      const paid = invoice.payments.reduce((inner, payment) => inner + Number(payment.amount), 0);
      return sum + Math.max(Number(invoice.totalAmount) - paid, 0);
    }, 0);

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / BILLING</p><h1>Invoices</h1><p>Buat billing snapshot dari nilai Sales Order dan pantau posisi piutang.</p></div>
        <div className="workspaceHeadingStats"><span><b>{workspace.invoices.length}</b> invoice</span><span><b>{currency.format(outstanding)}</b> outstanding</span></div>
      </div>

      <SalesWorkspaceNav active="invoices" />
      {params.saved === "1" ? <div className="notice successNotice">Invoice berhasil dibuat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="workspaceSplit crmSplit">
        <form action={submitInvoice} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader"><div><span>NEW INVOICE</span><h2>Terbitkan tagihan</h2></div><small>Snapshot billing</small></div>
          <section className="formSectionBlock">
            <h3>Sales Order</h3>
            <label><span>Order yang belum seluruhnya ditagihkan</span><select name="salesOrderId" required defaultValue=""><option value="">Pilih sales order</option>{workspace.orders.map((order) => <option value={order.id} key={order.id}>{order.orderNumber} · {order.customerName} · sisa {currency.format(order.remainingInvoiceable)}</option>)}</select></label>
          </section>
          <section className="formSectionBlock">
            <h3>Tanggal & nilai</h3>
            <div className="compactFieldGrid two">
              <label><span>Tanggal invoice</span><input name="issueDate" type="date" defaultValue={todayInJakarta()} required /></label>
              <label><span>Jatuh tempo</span><input name="dueDate" type="date" /></label>
            </div>
            <div className="compactFieldGrid two">
              <label><span>Subtotal (kosong = seluruh sisa order)</span><div className="compactUnitInput money"><b>Rp</b><input name="subtotalAmount" type="number" min="1" step="1" placeholder="otomatis" /></div></label>
              <label><span>Adjustment (+ charge / - discount)</span><div className="compactUnitInput money"><b>Rp</b><input name="adjustmentAmount" type="number" step="1" placeholder="0" /></div></label>
            </div>
          </section>
          <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan invoice</span><textarea name="notes" rows={3} placeholder="Termin, pajak/ongkir bila ada, catatan pembayaran..." /></label></section>
          {workspace.orders.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Tidak ada order yang masih dapat ditagihkan.</span></div> : null}
          <div className="workspaceFormActions"><span>Invoice menyimpan nilai billing sebagai snapshot historis.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.orders.length === 0}>Terbitkan Invoice</button></div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader"><div><span>INVOICE BOOK</span><h2>Riwayat invoice</h2></div><small>{workspace.invoices.length} record</small></div>
          <div className="recordTable invoiceRecordTable">
            <div className="recordTableHead"><span>Invoice</span><span>Nilai</span><span>Piutang</span><span>Status / Aksi</span></div>
            {workspace.invoices.length === 0 ? <div className="recordEmpty">Belum ada invoice.</div> : workspace.invoices.map((invoice) => {
              const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
              const outstandingAmount = Math.max(Number(invoice.totalAmount) - paid, 0);
              return <div className="recordTableRow" key={invoice.id}>
                <div><strong>{invoice.invoiceNumber}</strong><small>{invoice.salesOrder.orderNumber} · {invoice.salesOrder.customer.name} · {dateFormatter.format(invoice.issueDate)}</small></div>
                <div><strong>{currency.format(Number(invoice.totalAmount))}</strong><small>subtotal {currency.format(Number(invoice.subtotalAmount))}{Number(invoice.adjustmentAmount) !== 0 ? ` · adj ${currency.format(Number(invoice.adjustmentAmount))}` : ""}</small></div>
                <div><strong>{currency.format(outstandingAmount)}</strong><small>paid {currency.format(paid)}{invoice.dueDate ? ` · due ${dateFormatter.format(invoice.dueDate)}` : ""}</small></div>
                <div className="recordActionCell"><span className={`statusBadge ${invoice.status === "PAID" ? "good" : invoice.status === "VOID" ? "danger" : "warning"}`}>{invoice.status}</span>{invoice.status !== "PAID" && invoice.status !== "VOID" ? <a className="tableActionLink" href={`/sales/payments?invoiceId=${encodeURIComponent(invoice.id)}`}>Bayar</a> : null}{paid === 0 && invoice.status !== "VOID" ? <form action={submitVoidInvoice}><input type="hidden" name="invoiceId" value={invoice.id} /><button className="tableActionButton dangerText" type="submit">Void</button></form> : null}</div>
              </div>;
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
