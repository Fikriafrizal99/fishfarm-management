import Link from "next/link";
import { getDashboardOverview } from "@/src/application/dashboard/get-dashboard-overview";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { CostIcon, HarvestIcon, InputIcon, SamplingIcon } from "@/app/_components/icons";

export const dynamic = "force-dynamic";

const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number2 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function statusLabel(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION") {
  if (status === "ON_TARGET") return "ON TARGET";
  if (status === "NEEDS_ATTENTION") return "NEEDS ATTENTION";
  return "MONITOR";
}

function statusClass(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION") {
  if (status === "ON_TARGET") return "good";
  if (status === "NEEDS_ATTENTION") return "danger";
  return "warning";
}

export default async function BudidayaPage() {
  let dashboard: Awaited<ReturnType<typeof getDashboardOverview>> = null;

  try {
    dashboard = await getDashboardOverview();
  } catch {
    dashboard = null;
  }

  if (!dashboard) {
    return (
      <main className="shell formShell">
        <section className="panel emptyState">
          <p className="eyebrow dark">Budidaya</p>
          <h1>Data budidaya belum tersedia</h1>
          <p>Pastikan development database aktif lalu refresh halaman.</p>
        </section>
      </main>
    );
  }

  const alertCount = dashboard.cycles.reduce((sum, cycle) => sum + cycle.openAlertCount, 0);

  return (
    <AppFrame
      active="budidaya"
      ownerName={dashboard.ownerName}
      alertCount={alertCount}
      activePonds={dashboard.activePonds}
    >
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow">
          <div>
            <p className="workspaceKicker">PRODUCTION OPERATIONS</p>
            <h1>Budidaya</h1>
            <p>Kolam, siklus aktif, performa biologis, dan pencatatan operasional.</p>
          </div>
          <div className="quickActions">
            <Link className="actionButton primary" href="/input"><InputIcon size={15} />Input Harian</Link>
            <Link className="actionButton" href="/sampling"><SamplingIcon size={15} />Sampling</Link>
            <Link className="actionButton" href="/harvest"><HarvestIcon size={15} />Panen</Link>
            <Link className="actionButton" href="/expenses"><CostIcon size={15} />Biaya</Link>
          </div>
        </div>

        <BudidayaWorkspaceNav active="overview" />

        <section className="summaryStrip" aria-label="Ringkasan budidaya">
          <article><span className="summaryIcon blue"><InputIcon size={16} /></span><div><span>Kolam Aktif</span><strong>{number0.format(dashboard.activePonds)}</strong><small>kolam</small></div></article>
          <article><span className="summaryIcon cyan"><SamplingIcon size={16} /></span><div><span>Ikan Aktif</span><strong>{number0.format(dashboard.activeFish)}</strong><small>ekor</small></div></article>
          <article><span className="summaryIcon green"><HarvestIcon size={16} /></span><div><span>Biomassa</span><strong>{number1.format(dashboard.estimatedBiomassKg)}</strong><small>kg</small></div></article>
          <article><span className="summaryIcon teal"><CostIcon size={16} /></span><div><span>Biaya Berjalan</span><strong>{currency.format(dashboard.runningCost)}</strong></div></article>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline">
            <h2>Kolam & Siklus Aktif</h2>
            <span className="mutedInline">{dashboard.cycles.length} siklus</span>
          </div>
          <div className="pondWorkspaceList">
            {dashboard.cycles.map((cycle) => (
              <Link className="pondWorkspaceRow" href={`/ponds/${encodeURIComponent(cycle.pondCode)}`} key={cycle.cycleId}>
                <div>
                  <strong>{cycle.pondCode} — {cycle.species}</strong>
                  <span>Hari {cycle.day} · {number0.format(cycle.estimatedPopulation)} ekor · ABW {cycle.averageWeightG === null ? "—" : `${number0.format(cycle.averageWeightG)} g`}</span>
                </div>
                <div className="pondWorkspaceMetrics">
                  <span>SR <b>{cycle.survivalRatePct === null ? "—" : `${number1.format(cycle.survivalRatePct)}%`}</b></span>
                  <span>FCR <b>{cycle.fcr === null ? "—" : number2.format(cycle.fcr)}</b></span>
                  <span>Biomassa <b>{cycle.estimatedBiomassKg === null ? "—" : `${number1.format(cycle.estimatedBiomassKg)} kg`}</b></span>
                  <i className={`statusBadge ${statusClass(cycle.status)}`}>{statusLabel(cycle.status)}</i>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <h2>Quick Actions</h2>
          <div className="moduleLinkGrid">
            <Link href="/input"><InputIcon size={18} /><div><strong>Input Harian</strong><span>Pakan, mortalitas, dan kondisi lapangan.</span></div><b>→</b></Link>
            <Link href="/sampling"><SamplingIcon size={18} /><div><strong>Sampling</strong><span>ABW, panjang, populasi teramati.</span></div><b>→</b></Link>
            <Link href="/harvest"><HarvestIcon size={18} /><div><strong>Panen</strong><span>Panen parsial/final dan HarvestLot.</span></div><b>→</b></Link>
            <Link href="/expenses"><CostIcon size={18} /><div><strong>Biaya</strong><span>Raw cost tambahan per siklus.</span></div><b>→</b></Link>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
