import Link from "next/link";
import { getSalesDashboard } from "@/src/application/sales/get-sales-dashboard";

export const dynamic = "force-dynamic";

const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
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

export default async function SalesDashboardPage() {
  let dashboard: Awaited<ReturnType<typeof getSalesDashboard>> = null;
  let databaseUnavailable = false;

  try {
    dashboard = await getSalesDashboard();
  } catch {
    databaseUnavailable = true;
  }

  if (!dashboard) {
    return (
      <main className="shell">
        <div className="topBar">
          <Link className="backLink" href="/">← Dashboard Budidaya</Link>
        </div>
        <section className="panel emptyState">
          <p className="eyebrow dark">Sales CRM</p>
          <h1>{databaseUnavailable ? "Database belum tersambung" : "Belum ada farm"}</h1>
          <p>Sales CRM akan aktif setelah development database dan seed dijalankan.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell salesShell">
      <div className="topBar">
        <Link className="backLink" href="/">← Dashboard Budidaya</Link>
        <span className="badge good">SALES CRM</span>
      </div>

      <header className="salesHero">
        <div>
          <p className="eyebrow">{dashboard.farmName}</p>
          <h1>Sales & CRM</h1>
          <p>Lead, customer, order, fulfillment, invoice, dan pembayaran dipisahkan dari operasional kolam.</p>
        </div>
        <div className="heroActions">
          <Link className="secondaryButton lightButton" href="/sales/leads">+ Lead</Link>
          <Link className="heroAction" href="/sales/orders">+ Order</Link>
        </div>
      </header>

      <nav className="salesNav" aria-label="Sales CRM navigation">
        <Link href="/sales/leads">Leads</Link>
        <Link href="/sales/customers">Customers</Link>
        <Link href="/sales/orders">Orders</Link>
        <Link href="/sales/fulfillment">Fulfillment</Link>
      </nav>

      <section className="metrics salesMetrics" aria-label="Sales summary">
        <article><span>Open Leads</span><strong>{number0.format(dashboard.openLeads)}</strong></article>
        <article><span>Pipeline</span><strong>{currency.format(dashboard.pipelineValue)}</strong></article>
        <article><span>Confirmed Order</span><strong>{number1.format(dashboard.confirmedOrderKg)} kg</strong></article>
        <article><span>Order Value</span><strong>{currency.format(dashboard.confirmedOrderValue)}</strong></article>
        <article><span>Allocated</span><strong>{number1.format(dashboard.allocatedKg)} kg</strong></article>
        <article><span>Harvest Stock</span><strong>{number1.format(dashboard.availableHarvestedKg)} kg</strong></article>
        <article><span>Piutang</span><strong>{currency.format(dashboard.outstandingReceivables)}</strong></article>
        <article><span>Kas Masuk Bulan Ini</span><strong>{currency.format(dashboard.collectedThisMonth)}</strong></article>
      </section>

      <section className="twoColumn">
        <article className="panel">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Pipeline</p>
              <h2>Lead yang perlu ditindaklanjuti</h2>
            </div>
            <Link className="textLink" href="/sales/leads">Semua →</Link>
          </div>
          <div className="crmList">
            {dashboard.upcomingLeads.length === 0 ? (
              <div className="emptyInline">Belum ada lead aktif.</div>
            ) : dashboard.upcomingLeads.map((lead) => (
              <div className="crmRow" key={lead.id}>
                <div>
                  <strong>{lead.title}</strong>
                  <span>
                    {lead.expectedDemandKg === null ? "Qty belum ditentukan" : `${number1.format(lead.expectedDemandKg)} kg`}
                    {lead.expectedPricePerKg === null ? "" : ` · ${currency.format(lead.expectedPricePerKg)}/kg`}
                  </span>
                </div>
                <div className="crmRowRight">
                  <span className="badge warning">{lead.status}</span>
                  <small>{lead.nextFollowUpAt ? dateFormatter.format(lead.nextFollowUpAt) : "No follow-up"}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Order Book</p>
              <h2>Order aktif</h2>
            </div>
            <Link className="textLink" href="/sales/orders">Semua →</Link>
          </div>
          <div className="crmList">
            {dashboard.activeOrders.length === 0 ? (
              <div className="emptyInline">Belum ada order aktif.</div>
            ) : dashboard.activeOrders.map((order) => (
              <div className="crmRow" key={order.id}>
                <div>
                  <strong>{order.orderNumber} · {order.customerName}</strong>
                  <span>{number1.format(order.quantityKg)} kg · {currency.format(order.orderValue)}</span>
                </div>
                <div className="crmRowRight">
                  <span className="badge good">{order.status}</span>
                  <small>{number1.format(order.allocatedKg)} kg allocated</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Fulfillment Bridge</p>
            <h2>Harvest inventory</h2>
          </div>
          <Link className="textLink" href="/sales/fulfillment">Buka fulfillment →</Link>
        </div>

        <p className="metricDisclaimer">
          Order tidak terikat langsung ke kolam. Hanya alokasi fulfillment yang menghubungkan SalesOrderItem dengan HarvestLot.
        </p>

        <div className="crmList">
          {dashboard.inventoryLots.length === 0 ? (
            <div className="emptyInline">
              Belum ada HarvestLot. Order tetap dapat dicatat sekarang dan dialokasikan setelah panen tersedia.
            </div>
          ) : dashboard.inventoryLots.map((lot) => (
            <div className="crmRow" key={lot.id}>
              <div>
                <strong>{lot.lotCode} · {lot.species}</strong>
                <span>{lot.pondCode} · panen {dateFormatter.format(lot.harvestedAt)}</span>
              </div>
              <div className="crmRowRight">
                <strong>{number1.format(lot.availableKg)} kg available</strong>
                <small>{number1.format(lot.allocatedKg)} / {number1.format(lot.quantityKg)} kg allocated</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer>V0.8 · Sales CRM terpisah, terhubung ke produksi hanya melalui HarvestLot/Fulfillment.</footer>
    </main>
  );
}
