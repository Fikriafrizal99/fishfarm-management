import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { getPaymentWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { submitPayment } from "./actions";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; invoiceId?: string }> }) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getPaymentWorkspace>> = { invoices: [], payments: [] };
  let databaseError = false;
  try {
    workspace = await getPaymentWorkspace();
  } catch {
    databaseError = true;
  }

  const selectedInvoiceId = workspace.invoices.some((invoice) => invoice.id === params.invoiceId) ? params.invoiceId : "";
  const outstanding = workspace.invoices.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0);
  const collected = workspace.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / COLLECTION</p><h1>Payments</h1><p>Catat penerimaan kas terhadap invoice, termasuk DP, cicilan, dan pelunasan.</p></div>
        <div className="workspaceHeadingStats"><span><b>{currency.format(outstanding)}</b> outstanding</span><span><b>{currency.format(collected)}</b> total tercatat</span></div>
      </div>

      <SalesWorkspaceNav active="payments" />
      {params.saved === "1" ? <div className="notice successNotice">Pembayaran berhasil dicatat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="workspaceSplit crmSplit">
        <form action={submitPayment} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader"><div><span>NEW PAYMENT</span><h2>Catat pembayaran</h2></div><small>Cash collection</small></div>
          <section className="formSectionBlock">
            <h3>Invoice</h3>
            <label><span>Invoice belum lunas</span><select name="invoiceId" required defaultValue={selectedInvoiceId}><option value="">Pilih invoice</option>{workspace.invoices.map((invoice) => <option value={invoice.id} key={invoice.id}>{invoice.invoiceNumber} · {invoice.customerName} · sisa {currency.format(invoice.outstandingAmount)}</option>)}</select></label>
          </section>
          <section className="formSectionBlock">
            <h3>Penerimaan</h3>
            <div className="compactFieldGrid two">
              <label><span>Tanggal bayar</span><input name="paidDate" type="date" defaultValue={todayInJakarta()} required /></label>
              <label><span>Metode</span><select name="method" defaultValue="TRANSFER"><option value="TRANSFER">Transfer</option><option value="CASH">Cash</option><option value="QRIS">QRIS</option><option value="OTHER">Other</option></select></label>
            </div>
            <label><span>Nominal</span><div className="compactUnitInput money"><b>Rp</b><input name="amount" type="number" min="1" step="1" placeholder="500000" required /></div></label>
            <label><span>Referensi</span><input name="reference" placeholder="Nomor transfer / kuitansi / referensi" /></label>
          </section>
          <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan pembayaran</span><textarea name="notes" rows={3} placeholder="DP, pelunasan, rekening penerima, catatan rekonsiliasi..." /></label></section>
          {workspace.invoices.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Tidak ada invoice ISSUED/PARTIALLY_PAID yang masih memiliki piutang.</span></div> : null}
          <div className="workspaceFormActions"><span>Status invoice otomatis menjadi PARTIALLY_PAID atau PAID.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.invoices.length === 0}>Catat Payment</button></div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader"><div><span>PAYMENT LOG</span><h2>Riwayat penerimaan</h2></div><small>{workspace.payments.length} record</small></div>
          <div className="recordTable paymentRecordTable">
            <div className="recordTableHead"><span>Payment</span><span>Invoice</span><span>Nominal</span><span>Metode</span></div>
            {workspace.payments.length === 0 ? <div className="recordEmpty">Belum ada pembayaran.</div> : workspace.payments.map((payment) => <div className="recordTableRow" key={payment.id}>
              <div><strong>{dateFormatter.format(payment.paidAt)}</strong><small>{payment.reference ?? "tanpa referensi"}</small></div>
              <div><strong>{payment.invoice.invoiceNumber}</strong><small>{payment.invoice.salesOrder.orderNumber} · {payment.invoice.salesOrder.customer.name}</small></div>
              <div><strong>{currency.format(Number(payment.amount))}</strong><small>{payment.notes ?? "penerimaan kas"}</small></div>
              <div><span className="statusBadge good">{payment.method}</span></div>
            </div>) }
          </div>
        </section>
      </section>
    </div>
  );
}
