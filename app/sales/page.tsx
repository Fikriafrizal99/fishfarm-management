import Link from "next/link";
import { getSalesDashboard } from "@/src/application/sales/get-sales-dashboard";
import { SalesIcon } from "@/app/_components/icons";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";

export const dynamic = "force-dynamic";

const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function SalesDashboardPage() {
  let dashboard: Awaited<ReturnType<typeof getSalesDashboard>> = null;
  let databaseUnavailable = false;

  try {
    dashboard = await getSalesDashboard();
  } catch {
    databaseUnavailable = true;
  }

  if (!dashboard) {
    return <div className="opsPage"><section className="workspaceCard emptyState"><p className="eyebrow dark">Sales CRM</p><h1>{databaseUnavailable ? "Database belum tersambung" : "Belum ada farm"}</h1><p>Sales CRM akan aktif setelah development database dan seed dijalankan.</p></section></div>;
  }

  return (
    <div className="opsPage crmWorkspacePage salesOpsPage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">COMMERCIAL OPERATIONS</p><h1>Sales CRM</h1><p>Lead → Pipeline → Order → Fulfillment → Delivery → Invoice → Payment.</p></div>
        <div className="quickActions"><Link className="actionButton" href="/sales/leads">+ Lead</Link><Link className="actionButton" href="/sales/pipeline">+ Opportunity</Link><Link className="actionButton primary" href="/sales/orders">+ Order</Link></div>
      </div>

      <SalesWorkspaceNav active="overview" />

      <section className="salesKpiGrid" aria-label="Sales summary">
        <article><span>Open Leads</span><strong>{number0.format(dashboard.openLeads)}</strong></article>
        <article><span>Pipeline</span><strong>{currency.format(dashboard.pipelineValue)}</strong></article>
        <article><span>Confirmed Order</span><strong>{number1.format(dashboard.confirmedOrderKg)} kg</strong></article>
        <article><span>Order Value</span><strong>{currency.format(dashboard.confirmedOrderValue)}</strong></article>
        <article><span>Allocated</span><strong>{number1.format(dashboard.allocatedKg)} kg</strong></article>
        <article><span>Harvest Stock</span><strong>{number1.format(dashboard.availableHarvestedKg)} kg</strong></article>
        <article><span>Piutang</span><strong>{currency.format(dashboard.outstandingReceivables)}</strong></article>
        <article><span>Kas Masuk Bulan Ini</span><strong>{currency.format(dashboard.collectedThisMonth)}</strong></article>
      </section>

      <div className="salesDashboardGrid">
        <section className="workspaceCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Acquisition</p><h2>Lead yang perlu ditindaklanjuti</h2></div><Link href="/sales/leads">Semua →</Link></div>
          <div className="crmList">
            {dashboard.upcomingLeads.length === 0 ? <div className="emptyInline">Belum ada lead aktif.</div> : dashboard.upcomingLeads.map((lead) => <div className="crmRow" key={lead.id}><div><strong>{lead.title}</strong><span>{lead.expectedDemandKg === null ? "Qty belum ditentukan" : `${number1.format(lead.expectedDemandKg)} kg`}{lead.expectedPricePerKg === null ? "" : ` · ${currency.format(lead.expectedPricePerKg)}/kg`}</span></div><div className="crmRowRight"><span className="badge warning">{lead.status}</span><small>{lead.nextFollowUpAt ? dateFormatter.format(lead.nextFollowUpAt) : "No follow-up"}</small></div></div>)}
          </div>
        </section>

        <section className="workspaceCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Order Book</p><h2>Order aktif</h2></div><Link href="/sales/orders">Semua →</Link></div>
          <div className="crmList">
            {dashboard.activeOrders.length === 0 ? <div className="emptyInline">Belum ada order aktif.</div> : dashboard.activeOrders.map((order) => <div className="crmRow" key={order.id}><div><strong>{order.orderNumber} · {order.customerName}</strong><span>{number1.format(order.quantityKg)} kg · {currency.format(order.orderValue)}</span></div><div className="crmRowRight"><span className="badge warning">{order.status}</span><small>{number1.format(order.allocatedKg)} kg allocated</small></div></div>)}
          </div>
        </section>
      </div>

      <section className="workspaceCard moduleMenuCard">
        <div className="sectionHeaderInline"><div><p className="eyebrow dark">Fulfillment Bridge</p><h2>Harvest Inventory</h2></div><Link href="/sales/fulfillment">Buka fulfillment →</Link></div>
        <p className="metricDisclaimer">Order tidak terikat langsung ke kolam. FulfillmentAllocation menghubungkan SalesOrderItem dengan HarvestLot.</p>
        <div className="crmList">
          {dashboard.inventoryLots.length === 0 ? <div className="emptyInline">Belum ada HarvestLot. Order tetap dapat dicatat dan dialokasikan setelah panen tersedia.</div> : dashboard.inventoryLots.map((lot) => <div className="crmRow" key={lot.id}><div><strong>{lot.lotCode} · {lot.species}</strong><span>{lot.pondCode} · panen {dateFormatter.format(lot.harvestedAt)}</span></div><div className="crmRowRight"><strong>{number1.format(lot.availableKg)} kg available</strong><small>{number1.format(lot.allocatedKg)} / {number1.format(lot.quantityKg)} kg allocated</small></div></div>)}
        </div>
      </section>

      <section className="workspaceCard crmBoundaryCard">
        <SalesIcon size={18} />
        <div><strong>CRM flow aktif</strong><p>Opportunity, Delivery, Invoice, dan Payment sekarang memiliki write flow. Production tetap hanya terhubung ke Sales melalui HarvestLot/Fulfillment.</p></div>
      </section>
    </div>
  );
}
