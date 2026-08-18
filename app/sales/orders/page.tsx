import Link from "next/link";
import { getSalesFormOptions, getSalesOrders } from "@/src/application/sales/get-sales-lists";
import { submitSalesOrder } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function SalesOrdersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  let orders: Awaited<ReturnType<typeof getSalesOrders>> = [];
  let options: Awaited<ReturnType<typeof getSalesFormOptions>> = { customers: [], species: [] };
  let databaseError = false;

  try {
    [orders, options] = await Promise.all([getSalesOrders(), getSalesFormOptions()]);
  } catch {
    databaseError = true;
  }

  return (
    <div className="opsPage salesSubPage">
      <div className="pageTitleRow salesSubTitle">
        <div>
          <Link className="detailBackLink" href="/sales">← Sales Dashboard</Link>
          <h1>Sales Orders</h1>
          <p>Order dapat dikonfirmasi sebelum stok panen tersedia.</p>
        </div>
        <span className="statusBadge good">ORDERS</span>
      </div>

      <nav className="salesWorkspaceNav" aria-label="Sales CRM navigation">
        <Link href="/sales">Overview</Link><Link href="/sales/leads">Leads</Link><Link href="/sales/customers">Customers</Link><Link className="active" href="/sales/orders">Orders</Link><Link href="/sales/fulfillment">Fulfillment</Link>
      </nav>

      {params.saved === "1" ? <div className="notice successNotice">Sales order berhasil dibuat.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="salesSubGrid">
        <form action={submitSalesOrder} className="workspaceCard inputForm operationalFormCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">New Order</p><h2>Catat order</h2></div></div>
          <label><span>Customer</span><select name="customerId" required defaultValue=""><option value="">Pilih customer</option>{options.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.customerType}</option>)}</select></label>
          <label><span>Species / produk</span><select name="speciesId" required defaultValue=""><option value="">Pilih species</option>{options.species.map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}</select></label>
          <div className="formGrid">
            <label><span>Jumlah order</span><div className="inputWithUnit"><input name="quantityKg" type="number" min="0.001" step="0.001" required placeholder="100" /><b>kg</b></div></label>
            <label><span>Harga per kg</span><div className="inputWithUnit moneyInput"><b>Rp</b><input name="unitPricePerKg" type="number" min="1" step="1" required placeholder="23500" /></div></label>
          </div>
          <label><span>Target pengiriman</span><input name="requestedDeliveryDate" type="date" /></label>
          <label><span>Term pembayaran</span><input name="paymentTerms" placeholder="COD / DP 30% / tempo 7 hari" /></label>
          <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ukuran ikan, packing, alamat pengiriman, dll." /></label>
          {options.customers.length === 0 ? <div className="infoBox"><strong>Belum ada customer</strong><span>Tambahkan customer dulu sebelum membuat order.</span><Link className="textLink" href="/sales/customers">Tambah customer →</Link></div> : null}
          <button className="primaryButton" type="submit" disabled={databaseError || options.customers.length === 0 || options.species.length === 0}>Buat Sales Order</button>
        </form>

        <section className="workspaceCard salesListCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Order Book</p><h2>Riwayat order</h2></div><span className="mutedInline">{orders.length} order</span></div>
          <div className="crmList">
            {orders.length === 0 ? <div className="emptyInline">Belum ada sales order.</div> : orders.map((order) => {
              const quantityKg = order.items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
              const orderValue = order.items.reduce((sum, item) => sum + Number(item.quantityKg) * Number(item.unitPricePerKg), 0);
              const allocatedKg = order.items.reduce((sum, item) => sum + item.allocations.filter((allocation) => allocation.status !== "CANCELLED").reduce((inner, allocation) => inner + Number(allocation.allocatedKg), 0), 0);
              const invoiced = order.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
              const paid = order.invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + Number(payment.amount), 0), 0);
              return (
                <div className="crmRow crmOrderRow" key={order.id}>
                  <div><strong>{order.orderNumber} · {order.customer.name}</strong><span>{number1.format(quantityKg)} kg · {currency.format(orderValue)}</span><span>Allocated {number1.format(allocatedKg)} kg · Invoice {currency.format(invoiced)} · Paid {currency.format(paid)}</span>{order.requestedDeliveryDate ? <span>Delivery {dateFormatter.format(order.requestedDeliveryDate)}</span> : null}</div>
                  <div className="crmRowRight"><span className={`badge ${order.status === "CANCELLED" ? "danger" : order.status === "FULFILLED" ? "good" : "warning"}`}>{order.status}</span></div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
