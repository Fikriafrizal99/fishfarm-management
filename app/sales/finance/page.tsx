import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { ExportMenu } from "@/app/_components/export-menu";
import { getInvoiceWorkspace, getPaymentWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { submitInvoice, submitVoidInvoice } from "@/app/sales/invoices/actions";
import { submitPayment } from "@/app/sales/payments/actions";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function todayInJakarta(): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ invoiceSaved?: string; paymentSaved?: string; error?: string; invoiceId?: string }> }) {
  const params = await searchParams;
  let invoiceWorkspace: Awaited<ReturnType<typeof getInvoiceWorkspace>> = { orders: [], invoices: [] };
  let paymentWorkspace: Awaited<ReturnType<typeof getPaymentWorkspace>> = { invoices: [], payments: [] };
  let databaseError = false;
  try {
    [invoiceWorkspace, paymentWorkspace] = await Promise.all([getInvoiceWorkspace(), getPaymentWorkspace()]);
  } catch {
    databaseError = true;
  }

  const selectedInvoiceId = paymentWorkspace.invoices.some((invoice) => invoice.id === params.invoiceId) ? params.invoiceId : "";
  const totalInvoiced = invoiceWorkspace.invoices.filter((invoice) => invoice.status !== "VOID").reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const totalCollected = paymentWorkspace.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = paymentWorkspace.invoices.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0);
  const todayStart = new Date(`${todayInJakarta()}T00:00:00+07:00`);
  const aging = { current: 0, d1to30: 0, d31to60: 0, over60: 0 };
  for (const invoice of paymentWorkspace.invoices) {
    if (!invoice.dueDate || invoice.dueDate.getTime() >= todayStart.getTime()) {
      aging.current += invoice.outstandingAmount;
      continue;
    }
    const days = Math.max(1, Math.floor((todayStart.getTime() - invoice.dueDate.getTime()) / 86_400_000));
    if (days <= 30) aging.d1to30 += invoice.outstandingAmount;
    else if (days <= 60) aging.d31to60 += invoice.outstandingAmount;
    else aging.over60 += invoice.outstandingAmount;
  }
  const overdue = aging.d1to30 + aging.d31to60 + aging.over60;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / FINANCE</p><h1>Finance</h1><p>Billing, collection, dan aging piutang dalam satu workspace tanpa mencampur ledger invoice dan payment.</p></div>
        <div className="workspaceHeadingActions"><ExportMenu items={[{ label: "Payments CSV", href: "/api/export/data/payments" }]} /></div>
      </div>

      <SalesWorkspaceNav active="finance" />
      <div className="crmSubflowTabs"><a href="#invoice">Invoice</a><b>/</b><a href="#payment">Payment</a><b>/</b><a href="#aging">Aging Piutang</a></div>

      {params.invoiceSaved === "1" ? <div className="notice successNotice">Invoice berhasil dibuat.</div> : null}
      {params.paymentSaved === "1" ? <div className="notice successNotice">Pembayaran berhasil dicatat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="financeSummaryStrip">
        <article><span>Total Invoiced</span><strong>{currency.format(totalInvoiced)}</strong></article>
        <article><span>Collected</span><strong>{currency.format(totalCollected)}</strong></article>
        <article><span>Outstanding</span><strong>{currency.format(outstanding)}</strong></article>
        <article><span>Overdue</span><strong>{currency.format(overdue)}</strong></article>
      </div>

      <section className="crmFlowSection" id="aging">
        <div className="crmFlowSectionHeader"><div><p className="eyebrow dark">RECEIVABLE CONTROL</p><h2>Aging piutang</h2></div><span>berdasarkan due date invoice aktif</span></div>
        <div className="agingGrid">
          <article><span>Belum jatuh tempo</span><strong>{currency.format(aging.current)}</strong></article>
          <article className={aging.d1to30 > 0 ? "overdue" : ""}><span>1–30 hari</span><strong>{currency.format(aging.d1to30)}</strong></article>
          <article className={aging.d31to60 > 0 ? "overdue" : ""}><span>31–60 hari</span><strong>{currency.format(aging.d31to60)}</strong></article>
          <article className={aging.over60 > 0 ? "overdue" : ""}><span>&gt;60 hari</span><strong>{currency.format(aging.over60)}</strong></article>
        </div>
      </section>

      <section className="crmFlowSection" id="invoice">
        <div className="crmFlowSectionHeader"><div><p className="eyebrow dark">BILLING</p><h2>Invoice</h2></div><span>billing snapshot dari Sales Order</span></div>
        <div className="workspaceSplit crmSplit">
          <form action={submitInvoice} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>NEW INVOICE</span><h2>Terbitkan tagihan</h2></div><small>Snapshot billing</small></div>
            <section className="formSectionBlock"><h3>Sales Order</h3><label><span>Order yang belum seluruhnya ditagihkan</span><select name="salesOrderId" required defaultValue=""><option value="">Pilih sales order</option>{invoiceWorkspace.orders.map((order) => <option value={order.id} key={order.id}>{order.orderNumber} · {order.customerName} · sisa {currency.format(order.remainingInvoiceable)}</option>)}</select></label></section>
            <section className="formSectionBlock"><h3>Tanggal & nilai</h3><div className="compactFieldGrid two"><label><span>Tanggal invoice</span><input name="issueDate" type="date" defaultValue={todayInJakarta()} required /></label><label><span>Jatuh tempo</span><input name="dueDate" type="date" /></label></div><div className="compactFieldGrid two"><label><span>Subtotal (kosong = seluruh sisa order)</span><div className="compactUnitInput money"><b>Rp</b><input name="subtotalAmount" type="number" min="1" step="1" placeholder="otomatis" /></div></label><label><span>Adjustment (+ charge / - discount)</span><div className="compactUnitInput money"><b>Rp</b><input name="adjustmentAmount" type="number" step="1" placeholder="0" /></div></label></div></section>
            <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan invoice</span><textarea name="notes" rows={3} placeholder="Termin, ongkir, catatan pembayaran..." /></label></section>
            {invoiceWorkspace.orders.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Tidak ada order yang masih dapat ditagihkan.</span></div> : null}
            <div className="workspaceFormActions"><span>Invoice adalah snapshot historis; payment tidak mengubah nilai invoice.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || invoiceWorkspace.orders.length === 0}>Terbitkan Invoice</button></div>
          </form>

          <section className="workspaceCard recordWorkspaceCard">
            <div className="workspaceCardHeader"><div><span>INVOICE BOOK</span><h2>Riwayat invoice</h2></div><small>{invoiceWorkspace.invoices.length} record</small></div>
            <div className="recordTable invoiceRecordTable"><div className="recordTableHead"><span>Invoice</span><span>Nilai</span><span>Piutang</span><span>Status / Aksi</span></div>{invoiceWorkspace.invoices.length === 0 ? <div className="recordEmpty">Belum ada invoice.</div> : invoiceWorkspace.invoices.map((invoice) => { const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); const outstandingAmount = Math.max(Number(invoice.totalAmount) - paid, 0); return <div className="recordTableRow" key={invoice.id}><div><strong>{invoice.invoiceNumber}</strong><small>{invoice.salesOrder.orderNumber} · {invoice.salesOrder.customer.name} · {dateFormatter.format(invoice.issueDate)}</small></div><div><strong>{currency.format(Number(invoice.totalAmount))}</strong><small>subtotal {currency.format(Number(invoice.subtotalAmount))}</small></div><div><strong>{currency.format(outstandingAmount)}</strong><small>paid {currency.format(paid)}{invoice.dueDate ? ` · due ${dateFormatter.format(invoice.dueDate)}` : ""}</small></div><div className="recordActionCell"><span className={`statusBadge ${invoice.status === "PAID" ? "good" : invoice.status === "VOID" ? "danger" : "warning"}`}>{invoice.status}</span><a className="tableActionLink" href={`/api/export/invoices/${encodeURIComponent(invoice.id)}/pdf`}>PDF</a>{invoice.status !== "PAID" && invoice.status !== "VOID" ? <a className="tableActionLink" href={`/sales/finance?invoiceId=${encodeURIComponent(invoice.id)}#payment`}>Bayar</a> : null}{paid === 0 && invoice.status !== "VOID" ? <form action={submitVoidInvoice}><input type="hidden" name="invoiceId" value={invoice.id} /><button className="tableActionButton dangerText" type="submit">Void</button></form> : null}</div></div>; })}</div>
          </section>
        </div>
      </section>

      <section className="crmFlowSection" id="payment">
        <div className="crmFlowSectionHeader"><div><p className="eyebrow dark">COLLECTION</p><h2>Payment</h2></div><span>DP, cicilan, dan pelunasan</span></div>
        <div className="workspaceSplit crmSplit">
          <form action={submitPayment} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>NEW PAYMENT</span><h2>Catat pembayaran</h2></div><small>Cash collection</small></div>
            <section className="formSectionBlock"><h3>Invoice</h3><label><span>Invoice belum lunas</span><select name="invoiceId" required defaultValue={selectedInvoiceId}><option value="">Pilih invoice</option>{paymentWorkspace.invoices.map((invoice) => <option value={invoice.id} key={invoice.id}>{invoice.invoiceNumber} · {invoice.customerName} · sisa {currency.format(invoice.outstandingAmount)}</option>)}</select></label></section>
            <section className="formSectionBlock"><h3>Penerimaan</h3><div className="compactFieldGrid two"><label><span>Tanggal bayar</span><input name="paidDate" type="date" defaultValue={todayInJakarta()} required /></label><label><span>Metode</span><select name="method" defaultValue="TRANSFER"><option value="TRANSFER">Transfer</option><option value="CASH">Cash</option><option value="QRIS">QRIS</option><option value="OTHER">Other</option></select></label></div><label><span>Nominal</span><div className="compactUnitInput money"><b>Rp</b><input name="amount" type="number" min="1" step="1" placeholder="500000" required /></div></label><label><span>Referensi</span><input name="reference" placeholder="Nomor transfer / kuitansi / referensi" /></label></section>
            <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan pembayaran</span><textarea name="notes" rows={3} placeholder="DP, pelunasan, rekening penerima, catatan rekonsiliasi..." /></label></section>
            {paymentWorkspace.invoices.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Tidak ada invoice yang masih memiliki piutang.</span></div> : null}
            <div className="workspaceFormActions"><span>Status invoice otomatis menjadi PARTIALLY_PAID atau PAID.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || paymentWorkspace.invoices.length === 0}>Catat Payment</button></div>
          </form>

          <section className="workspaceCard recordWorkspaceCard">
            <div className="workspaceCardHeader"><div><span>PAYMENT LOG</span><h2>Riwayat penerimaan</h2></div><small>{paymentWorkspace.payments.length} record</small></div>
            <div className="recordTable paymentRecordTable"><div className="recordTableHead"><span>Payment</span><span>Invoice</span><span>Nominal</span><span>Metode</span></div>{paymentWorkspace.payments.length === 0 ? <div className="recordEmpty">Belum ada pembayaran.</div> : paymentWorkspace.payments.map((payment) => <div className="recordTableRow" key={payment.id}><div><strong>{dateFormatter.format(payment.paidAt)}</strong><small>{payment.reference ?? "tanpa referensi"}</small></div><div><strong>{payment.invoice.invoiceNumber}</strong><small>{payment.invoice.salesOrder.orderNumber} · {payment.invoice.salesOrder.customer.name}</small></div><div><strong>{currency.format(Number(payment.amount))}</strong><small>{payment.notes ?? "penerimaan kas"}</small></div><div><span className="statusBadge good">{payment.method}</span></div></div>)}</div>
          </section>
        </div>
      </section>
    </div>
  );
}
