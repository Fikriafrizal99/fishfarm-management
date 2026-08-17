import Link from "next/link";
import { getDashboardOverview } from "@/src/application/dashboard/get-dashboard-overview";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatKg(value: number): string {
  return `${oneDecimalFormatter.format(value)} kg`;
}

function formatPct(value: number | null): string {
  return value === null ? "—" : `${oneDecimalFormatter.format(value)}%`;
}

function formatFcr(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}

function statusLabel(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION"): string {
  if (status === "ON_TARGET") return "ON TARGET";
  if (status === "NEEDS_ATTENTION") return "NEEDS ATTENTION";
  return "MONITOR";
}

export default async function Home() {
  let dashboard: Awaited<ReturnType<typeof getDashboardOverview>> = null;
  let databaseUnavailable = false;

  try {
    dashboard = await getDashboardOverview();
  } catch {
    databaseUnavailable = true;
  }

  if (!dashboard) {
    return (
      <main className="shell">
        <header className="hero">
          <p className="eyebrow">FishFarm Management</p>
          <h1>Dashboard belum memiliki data</h1>
          <p>
            {databaseUnavailable
              ? "Development database belum tersambung. Setelah PostgreSQL dijalankan dan seed selesai, dashboard ini akan membaca data secara otomatis."
              : "Database tersambung tetapi belum ada farm. Jalankan development seed untuk membuat data awal."}
          </p>
        </header>

        <section className="panel emptyState">
          <p className="eyebrow dark">Development</p>
          <h2>UI sudah siap menerima data PostgreSQL</h2>
          <p>
            Tidak ada fallback angka dummy. Ini sengaja agar data yang terlihat di dashboard selalu dapat ditelusuri ke database.
          </p>
        </section>
      </main>
    );
  }

  const ownerFirstName = dashboard.ownerName?.split(" ")[0] ?? "Farmer";

  return (
    <main className="shell">
      <header className="hero">
        <div className="heroTopline">
          <div>
            <p className="eyebrow">FishFarm Management</p>
            <h1>Halo, {ownerFirstName} 👋</h1>
          </div>
          <div className="heroActions">
            <Link className="secondaryButton lightButton" href="/sales">Sales CRM</Link>
            <Link className="secondaryButton lightButton" href="/sampling">+ Sampling</Link>
            <Link className="heroAction" href="/input">+ Input Harian</Link>
          </div>
        </div>
        <p>{dashboard.farmName} · data langsung dari PostgreSQL</p>
      </header>

      <section className="metrics" aria-label="Ringkasan farm">
        <article>
          <span>Kolam Aktif</span>
          <strong>{formatNumber(dashboard.activePonds)}</strong>
        </article>
        <article>
          <span>Estimasi Ikan Aktif</span>
          <strong>{formatNumber(dashboard.activeFish)}</strong>
        </article>
        <article>
          <span>Estimasi Biomassa</span>
          <strong>{formatKg(dashboard.estimatedBiomassKg)}</strong>
        </article>
        <article>
          <span>Biaya Berjalan</span>
          <strong>{currencyFormatter.format(dashboard.runningCost)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">KPI Farm</p>
            <h2>Ringkasan performa aktif</h2>
          </div>
          <span className="badge good">LIVE DATA</span>
        </div>
        <div className="kpis">
          <div>
            <span>Estimated SR</span>
            <strong>{formatPct(dashboard.survivalRatePct)}</strong>
          </div>
          <div>
            <span>Mortalitas</span>
            <strong>{formatPct(dashboard.mortalityRatePct)}</strong>
          </div>
          <div>
            <span>FCR Farm</span>
            <strong>{formatFcr(dashboard.fcr)}</strong>
          </div>
          <div>
            <span>Siklus Aktif</span>
            <strong>{formatNumber(dashboard.cycles.length)}</strong>
          </div>
        </div>
        <p className="metricDisclaimer">
          SR, biomassa, dan FCR pada siklus aktif adalah metrik terhitung/estimasi dari raw logs; bukan hasil final panen.
        </p>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Status Kolam</p>
            <h2>Cycle overview</h2>
          </div>
          <Link className="textLink" href="/input">Catat data →</Link>
        </div>

        <div className="pondList">
          {dashboard.cycles.map((cycle) => (
            <article className="pondRow" key={cycle.cycleId}>
              <div className="pondMain">
                <Link className="pondLink" href={`/ponds/${encodeURIComponent(cycle.pondCode)}`}>
                  {cycle.pondCode} — {cycle.species}
                </Link>
                <span>
                  Hari ke-{cycle.day} · SR {formatPct(cycle.survivalRatePct)} · FCR {formatFcr(cycle.fcr)}
                </span>
                <span>
                  ABW {cycle.averageWeightG === null ? "—" : `${formatNumber(cycle.averageWeightG)} g`} · Biomassa {cycle.estimatedBiomassKg === null ? "—" : formatKg(cycle.estimatedBiomassKg)}
                </span>
                <span>
                  Biaya/kg biomassa {cycle.currentCostPerStandingKg === null ? "—" : currencyFormatter.format(cycle.currentCostPerStandingKg)}
                  {cycle.openAlertCount > 0 ? ` · ${cycle.openAlertCount} alert terbuka` : ""}
                </span>
              </div>
              <span
                className={`badge ${
                  cycle.status === "ON_TARGET"
                    ? "good"
                    : cycle.status === "NEEDS_ATTENTION"
                      ? "danger"
                      : "warning"
                }`}
              >
                {statusLabel(cycle.status)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        V0.8 · Dashboard Budidaya dan Sales CRM memakai domain terpisah dalam satu aplikasi.
      </footer>
    </main>
  );
}
