import Link from "next/link";
import { getSalesFormOptions, getSalesOrders } from "@/src/application/sales/get-sales-lists";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitSalesOrder } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let orders: Awaited<ReturnType<typeof getSalesOrders>> = [];
  let options: Awaited<ReturnType<typeof getSalesFormOptions>> = {
    customers: [],
    species: [],
  };
  let databaseError = false;

  try {
    [orders, options] = await Promise.all([getSalesOrders(), getSalesFormOptions()]);
  } catch {
    databaseError = true;
  }

  const openOrders = orders.filter((order) => !["FULFILLED", "CANCELLED"].includes(order.status)).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / ORDER BOOK</p>
          <h1>Sales Orders</h1>
          <p>Konfirmasi kebutuhan customer sebelum maupun sesudah HarvestLot tersedia.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{orders.length}</b> total order</span>
          <span><b>{openOrders}</b> masih terbuka</span>
        </div>
      </div>

      <SalesWorkspaceNav active="orders" />

      {params.saved === "1" ? <div className="notice successNotice">Sales order berhasil dibuat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit crmSplit">
        <form action={submitSalesOrder} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader">
            <div><span>NEW ORDER</span><h2>Catat order</h2></div>
            <small>1 produk / order V0.8</small>
          </div>

          <div className="formSectionBlock">
            <h3>Customer & produk</h3>
            <label>
              <span>Customer</span>
              <select name="customerId" required defaultValue="">
                <option value="">Pilih customer</option>
                {options.customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>{customer.name} · {customer.customerType}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Species / produk</span>
              <select name="speciesId" required defaultValue="">
                <option value="">Pilih species</option>
                {options.species.map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}
              </select>
            </label>
          </div>

          <div className="formSectionBlock">
            <h3>Nilai order</h3>
            <div className="compactFieldGrid two">
              <label>
                <span>Jumlah order</span>
                <div className="compactUnitInput"><input name="quantityKg" type="number" min="0.001" step="0.001" required placeholder="100" /><b>kg</b></div>
              </label>
              <label>
                <span>Harga per kg</span>
                <div className="compactUnitInput money"><b>Rp</b><input name="unitPricePerKg" type="number" min="1" step="1" required placeholder="23500" /></div>
              </label>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Pengiriman & pembayaran</h3>
            <label><span>Target pengiriman</span><input name="requestedDeliveryDate" type="date" /></label>
            <label><span>Term pembayaran</span><input name="paymentTerms" placeholder="COD / DP 30% / tempo 7 hari" /></label>
            <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ukuran ikan, packing, alamat pengiriman, dll." /></label>
          </div>

          {options.customers.length === 0 ? (
            <div className="workspaceInlineNotice">
              <strong>Customer belum tersedia.</strong>
              <Link href="/sales/customers">Tambah customer →</Link>
            </div>
          ) : null}

          <div className="workspaceFormActions">
            <span>Stok dialokasikan setelah order melalui Fulfillment.</span>
            <button className="workspacePrimaryButton" type="submit" disabled={databaseError || options.customers.length === 0 || options.species.length === 0}>Buat Sales Order</button>
          </div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader">
            <div><span>ORDER BOOK</span><h2>Riwayat order</h2></div>
            <small>{orders.length} record</small>
          </div>

          <div className="recordTable orderRecordTable">
            <div className="recordTableHead">
              <span>Order</span><span>Nilai</span><span>Fulfillment</span><span>Finance</span><span>Status</span>
            </div>
            {orders.length === 0 ? (
              <div className="recordEmpty">Belum ada sales order.</div>
            ) : orders.map((order) => {
              const quantityKg = order.items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
              const orderValue = order.items.reduce(
                (sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg),
                0,
              );
              const allocatedKg = order.items.reduce(
                (sum, item) =>
                  sum + item.allocations
                    .filter((allocation) => allocation.status !== "CANCELLED")
                    .reduce((inner, allocation) => inner + Number(allocation.allocatedKg), 0),
                0,
              );
              const invoiced = order.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
              const paid = order.invoices.reduce(
                (sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + Number(payment.amount), 0),
                0,
              );
              return (
                <article className="recordTableRow" key={order.id}>
                  <div><strong>{order.orderNumber}</strong><small>{order.customer.name}{order.requestedDeliveryDate ? ` · ${dateFormatter.format(order.requestedDeliveryDate)}` : ""}</small></div>
                  <div><strong>{number1.format(quantityKg)} kg</strong><small>{currency.format(orderValue)}</small></div>
                  <div><strong>{number1.format(allocatedKg)} kg</strong><small>allocated</small></div>
                  <div><strong>{currency.format(paid)}</strong><small>dari {currency.format(invoiced)}</small></div>
                  <div><span className={`statusBadge ${order.status === "CANCELLED" ? "danger" : order.status === "FULFILLED" ? "good" : "warning"}`}>{order.status}</span></div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
