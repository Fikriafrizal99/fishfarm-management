import Link from "next/link";
import { getSalesCustomers } from "@/src/application/sales/get-sales-lists";
import { getCustomerCommercialProfile } from "@/src/application/sales/get-customer-profile";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitCustomer } from "./actions";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; customerId?: string }>;
}) {
  const params = await searchParams;
  let customers: Awaited<ReturnType<typeof getSalesCustomers>> = [];
  let profile: Awaited<ReturnType<typeof getCustomerCommercialProfile>> = null;
  let databaseError = false;

  try {
    [customers, profile] = await Promise.all([
      getSalesCustomers(),
      getCustomerCommercialProfile(params.customerId),
    ]);
  } catch {
    databaseError = true;
  }

  const activeCustomers = customers.filter((customer) => customer.active).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / ACCOUNTS</p>
          <h1>Customers</h1>
          <p>Master pembeli sekaligus riwayat order, harga, delivery, collection, dan piutang per account.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{customers.length}</b> customer</span>
          <span><b>{activeCustomers}</b> aktif</span>
        </div>
      </div>

      <SalesWorkspaceNav active="customers" />

      {params.saved === "1" ? <div className="notice successNotice">Customer berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit crmSplit">
        <form action={submitCustomer} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader">
            <div><span>NEW CUSTOMER</span><h2>Tambah account pembeli</h2></div>
            <small>Master komersial</small>
          </div>

          <div className="formSectionBlock">
            <h3>Account</h3>
            <label><span>Nama customer</span><input name="name" required placeholder="RM Sederhana Cianjur" /></label>
            <label>
              <span>Tipe customer</span>
              <select name="customerType" defaultValue="OTHER">
                <option value="RESTAURANT">Restaurant</option>
                <option value="WHOLESALER">Pengepul / Wholesaler</option>
                <option value="RETAILER">Retailer</option>
                <option value="MARKET">Pasar</option>
                <option value="HOTEL">Hotel</option>
                <option value="CATERING">Catering</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </label>
          </div>

          <div className="formSectionBlock">
            <h3>Kontak</h3>
            <div className="compactFieldGrid two">
              <label><span>Contact person</span><input name="contactPerson" placeholder="Pak/Bu..." /></label>
              <label><span>WhatsApp</span><input name="whatsapp" inputMode="tel" placeholder="08..." /></label>
              <label><span>Telepon</span><input name="phone" inputMode="tel" /></label>
              <label><span>Email</span><input name="email" type="email" /></label>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Lokasi & catatan</h3>
            <label><span>Alamat</span><textarea name="addressText" rows={2} placeholder="Alamat pengiriman / lokasi customer" /></label>
            <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Preferensi ukuran, pembayaran, hari order, dll." /></label>
          </div>

          <div className="workspaceFormActions">
            <span>Customer menjadi account komersial, bukan entitas produksi.</span>
            <button className="workspacePrimaryButton" type="submit" disabled={databaseError}>Simpan Customer</button>
          </div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader">
            <div><span>ACCOUNTS</span><h2>Daftar customer</h2></div>
            <small>{customers.length} record</small>
          </div>

          <div className="recordTable customerRecordTable">
            <div className="recordTableHead">
              <span>Customer</span><span>Kontak</span><span>Tipe</span><span>Status</span>
            </div>
            {customers.length === 0 ? (
              <div className="recordEmpty">Belum ada customer.</div>
            ) : customers.map((customer) => (
              <article className="recordTableRow" key={customer.id}>
                <div>
                  <Link className="tableActionLink" href={`/sales/customers?customerId=${encodeURIComponent(customer.id)}`}><strong>{customer.name}</strong></Link>
                  <small>{customer.contactPerson ?? "Contact person belum diisi"}</small>
                </div>
                <div><strong>{customer.whatsapp ?? customer.phone ?? "—"}</strong><small>{customer.email ?? "Email belum diisi"}</small></div>
                <div><strong>{customer.customerType}</strong><small>Account komersial</small></div>
                <div><span className={`statusBadge ${customer.active ? "good" : "warning"}`}>{customer.active ? "ACTIVE" : "INACTIVE"}</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {profile ? (
        <section className="workspaceCard customerDetailCard">
          <div className="customerDetailHeader">
            <div>
              <p className="workspaceKicker">CUSTOMER PERFORMANCE</p>
              <h2>{profile.customer.name}</h2>
              <p>{profile.customer.customerType} · {profile.customer.contactPerson ?? "contact belum diisi"} · {profile.customer.whatsapp ?? profile.customer.phone ?? "tanpa telepon"}</p>
            </div>
            <Link className="tableAction" href="/sales/customers">Tutup detail</Link>
          </div>

          <div className="customerSummaryStrip">
            <article><span>Total Order</span><strong>{profile.summary.orderCount}</strong></article>
            <article><span>Ordered Qty</span><strong>{number1.format(profile.summary.quantityKg)} kg</strong></article>
            <article><span>Order Value</span><strong>{currency.format(profile.summary.orderValue)}</strong></article>
            <article><span>ASP / kg</span><strong>{profile.summary.averageSellingPricePerKg === null ? "—" : currency.format(profile.summary.averageSellingPricePerKg)}</strong></article>
            <article><span>Delivered</span><strong>{number1.format(profile.summary.deliveredKg)} kg</strong></article>
            <article><span>Collected</span><strong>{currency.format(profile.summary.paidAmount)}</strong></article>
            <article><span>Piutang</span><strong>{currency.format(profile.summary.outstandingAmount)}</strong></article>
            <article><span>Order Terakhir</span><strong>{profile.summary.lastOrderDate ? dateFormatter.format(profile.summary.lastOrderDate) : "—"}</strong></article>
          </div>

          <div className="customerHistoryGrid">
            <section>
              <h3>Purchase History</h3>
              <div className="customerTimeline">
                {profile.orders.length === 0 ? <div className="recordEmpty">Customer belum memiliki order.</div> : profile.orders.map((order) => (
                  <article key={order.id}>
                    <div><strong>{order.orderNumber}</strong><small>{dateFormatter.format(order.orderDate)} · {order.products}</small></div>
                    <div><strong>{number1.format(order.quantityKg)} kg · {order.averagePricePerKg === null ? "—" : `${currency.format(order.averagePricePerKg)}/kg`}</strong><small>delivered {number1.format(order.deliveredKg)} kg</small></div>
                    <div><b>{currency.format(order.orderValue)}</b><small>{order.status}</small></div>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3>Collection</h3>
              <div className="contextMetricList">
                <div><span>Invoiced</span><strong>{currency.format(profile.summary.invoicedAmount)}</strong></div>
                <div><span>Collected</span><strong>{currency.format(profile.summary.paidAmount)}</strong></div>
                <div><span>Outstanding</span><strong>{currency.format(profile.summary.outstandingAmount)}</strong></div>
                <div><span>Collection Rate</span><strong>{profile.summary.invoicedAmount > 0 ? `${number1.format((profile.summary.paidAmount / profile.summary.invoicedAmount) * 100)}%` : "—"}</strong></div>
                <div><span>Open Opportunity</span><strong>{profile.opportunities.filter((row) => row.status === "OPEN").length}</strong></div>
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </div>
  );
}
