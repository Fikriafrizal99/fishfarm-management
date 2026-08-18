import Link from "next/link";
import { getSalesFormOptions, getSalesOrders } from "@/src/application/sales/get-sales-lists";
import { getOpportunityWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { ExportMenu } from "@/app/_components/export-menu";
import { submitSalesOrder } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; opportunityId?: string; customerId?: string; speciesId?: string }>;
}) {
  const params = await searchParams;
  let orders: Awaited<ReturnType<typeof getSalesOrders>> = [];
  let options: Awaited<ReturnType<typeof getSalesFormOptions>> = { customers: [], species: [] };
  let opportunityWorkspace: Awaited<ReturnType<typeof getOpportunityWorkspace>> = { customers: [], leads: [], species: [], opportunities: [] };
  let databaseError = false;

  try {
    [orders, options, opportunityWorkspace] = await Promise.all([getSalesOrders(), getSalesFormOptions(), getOpportunityWorkspace()]);
  } catch {
    databaseError = true;
  }

  const openOpportunities = opportunityWorkspace.opportunities.filter((item) => item.status === "OPEN");
  const selectedOpportunity = openOpportunities.find((item) => item.id === params.opportunityId) ?? null;
  const selectedCustomerId = selectedOpportunity?.customerId ?? (options.customers.some((item) => item.id === params.customerId) ? params.customerId : "");
  const selectedSpeciesId = selectedOpportunity?.speciesId ?? (options.species.some((item) => item.id === params.speciesId) ? params.speciesId : "");

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / ORDER BOOK</p><h1>Sales Orders</h1><p>Konversi opportunity atau catat order langsung sebelum stok panen tersedia.</p></div>
        <div className="workspaceHeadingActions"><ExportMenu items={[{ label: "Sales Orders CSV", href: "/api/export/data/orders" }]} /></div>
      </div>

      <SalesWorkspaceNav active="orders" />
      {params.saved === "1" ? <div className="notice successNotice">Sales order berhasil dibuat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit crmSplit">
        <form action={submitSalesOrder} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader"><div><span>NEW ORDER</span><h2>Catat order</h2></div><small>1 produk per order</small></div>
          <div className="formSectionBlock"><h3>Opportunity / account</h3><label><span>Opportunity (opsional)</span><select name="opportunityId" defaultValue={selectedOpportunity?.id ?? ""}><option value="">Order langsung tanpa opportunity</option>{openOpportunities.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.customer.name}</option>)}</select></label><div className="compactFieldGrid two"><label><span>Customer</span><select name="customerId" required defaultValue={selectedCustomerId}><option value="">Pilih customer</option>{options.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.customerType}</option>)}</select></label><label><span>Species / produk</span><select name="speciesId" required defaultValue={selectedSpeciesId}><option value="">Pilih species</option>{options.species.map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}</select></label></div></div>
          <div className="formSectionBlock"><h3>Nilai order</h3><div className="compactFieldGrid two"><label><span>Jumlah order</span><div className="compactUnitInput"><input name="quantityKg" type="number" min="0.001" step="0.001" required defaultValue={selectedOpportunity?.expectedQtyKg ? Number(selectedOpportunity.expectedQtyKg) : undefined} placeholder="100" /><b>kg</b></div></label><label><span>Harga per kg</span><div className="compactUnitInput money"><b>Rp</b><input name="unitPricePerKg" type="number" min="1" step="1" required defaultValue={selectedOpportunity?.expectedPricePerKg ? Number(selectedOpportunity.expectedPricePerKg) : undefined} placeholder="23500" /></div></label></div></div>
          <div className="formSectionBlock"><h3>Pengiriman & pembayaran</h3><label><span>Target pengiriman</span><input name="requestedDeliveryDate" type="date" /></label><label><span>Term pembayaran</span><input name="paymentTerms" placeholder="COD / DP 30% / tempo 7 hari" /></label><label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ukuran ikan, packing, alamat pengiriman, dll." /></label></div>
          {selectedOpportunity ? <div className="workspaceInlineNotice neutral"><span>Order ini akan menandai opportunity <strong>{selectedOpportunity.title}</strong> sebagai WON dan lead asalnya sebagai CONVERTED.</span></div> : null}
          {options.customers.length === 0 ? <div className="workspaceInlineNotice"><strong>Customer belum tersedia.</strong><Link href="/sales/customers">Tambah customer →</Link></div> : null}
          <div className="workspaceFormActions"><span>Setelah order, alokasikan HarvestLot melalui Fulfillment.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || options.customers.length === 0 || options.species.length === 0}>Buat Sales Order</button></div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader"><div><span>ORDER BOOK</span><h2>Riwayat order</h2></div><small>{orders.length} record</small></div>
          <div className="recordTable orderRecordTable"><div className="recordTableHead"><span>Order</span><span>Nilai</span><span>Fulfillment</span><span>Finance</span><span>Status</span></div>{orders.length === 0 ? <div className="recordEmpty">Belum ada sales order.</div> : orders.map((order) => { const quantityKg = order.items.reduce((sum, item) => sum + Number(item.quantityKg), 0); const orderValue = order.items.reduce((sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg), 0); const allocatedKg = order.items.reduce((sum, item) => sum + item.allocations.filter((allocation) => allocation.status !== "CANCELLED").reduce((inner, allocation) => inner + Number(allocation.allocatedKg), 0), 0); const invoiced = order.invoices.filter((invoice) => invoice.status !== "VOID").reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0); const paid = order.invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + Number(payment.amount), 0), 0); return <article className="recordTableRow" key={order.id}><div><strong>{order.orderNumber}</strong><small>{order.customer.name}{order.requestedDeliveryDate ? ` · ${dateFormatter.format(order.requestedDeliveryDate)}` : ""}</small></div><div><strong>{number1.format(quantityKg)} kg</strong><small>{currency.format(orderValue)}</small></div><div><strong>{number1.format(allocatedKg)} kg</strong><small>allocated</small></div><div><strong>{currency.format(paid)}</strong><small>dari {currency.format(invoiced)}</small></div><div><span className={`statusBadge ${order.status === "CANCELLED" ? "danger" : order.status === "FULFILLED" ? "good" : "warning"}`}>{order.status}</span></div></article>; })}</div>
        </section>
      </div>
    </div>
  );
}
