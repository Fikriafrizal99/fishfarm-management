import Link from "next/link";
import { getDashboardOverview } from "@/src/application/dashboard/get-dashboard-overview";
import { AppFrame } from "./_components/app-frame";
import { GrowthChart } from "./_components/growth-chart";
import {
  AlertTriangleIcon,
  CostIcon,
  HarvestIcon,
  InputIcon,
  SamplingIcon,
} from "./_components/icons";

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
const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
});
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatPct(value: number | null): string {
  return value === null ? "—" : `${number1.format(value)}%`;
}

function formatFcr(value: number | null): string {
  return value === null ? "—" : number2.format(value);
}

function compactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${number1.format(value / 1_000_000_000)} M`;
  if (value >= 1_000_000) return `Rp ${number1.format(value / 1_000_000)} jt`;
  if (value >= 1_000) return `Rp ${number1.format(value / 1_000)} rb`;
  return currency.format(value);
}

function statusLabel(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION"): string {
  if (status === "ON_TARGET") return "ON TARGET";
  if (status === "NEEDS_ATTENTION") return "NEEDS ATTENTION";
  return "MONITOR";
}

function statusClass(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION"): string {
  if (status === "ON_TARGET") return "good";
  if (status === "NEEDS_ATTENTION") return "danger";
  return "warning";
}

function activityWhen(date: Date, now: Date): string {
  const currentKey = dayKeyFormatter.format(now);
  const activityKey = dayKeyFormatter.format(date);
  if (activityKey === currentKey) return timeFormatter.format(date);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (activityKey === dayKeyFormatter.format(yesterday)) return "Kemarin";
  return dateFormatter.format(date);
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
      <main className="shell formShell">
        <section className="panel emptyState">
          <p className="eyebrow dark">FishFarm Management</p>
          <h1>{databaseUnavailable ? "Database belum tersambung" : "Dashboard belum memiliki data"}</h1>
          <p>
            {databaseUnavailable
              ? "Jalankan PostgreSQL development database lalu refresh halaman ini."
              : "Database tersambung tetapi belum ada farm aktif."}
          </p>
        </section>
      </main>
    );
  }

  const now = new Date();
  const alertCount = dashboard.cycles.reduce((sum, cycle) => sum + cycle.openAlertCount, 0);
  const attentionCycle =
    dashboard.cycles.find((cycle) => cycle.status === "NEEDS_ATTENTION") ??
    dashboard.cycles.find((cycle) => cycle.status === "MONITOR") ??
    null;

  const chartSeries = dashboard.growthSeries
    .filter((item) => item.points.length > 0)
    .slice(0, 2)
    .map((item, index) => ({
      label: item.pondCode,
      tone: index === 0 ? ("teal" as const) : ("orange" as const),
      points: item.points.map((point) => ({
        date: point.sampledAt,
        value: point.averageWeightG,
      })),
    }));

  const targetCycle = dashboard.cycles.find(
    (cycle) => cycle.targetAverageWeightG !== null && cycle.targetHarvestDate !== null,
  );
  const targetGrowth = targetCycle
    ? dashboard.growthSeries.find((series) => series.cycleId === targetCycle.cycleId)
    : null;
  const targetChartSeries =
    targetCycle?.targetAverageWeightG !== null &&
    targetCycle?.targetHarvestDate &&
    targetGrowth &&
    targetGrowth.points.length >= 2
      ? (() => {
          const firstPoint = targetGrowth.points[0];
          const startTime = firstPoint.sampledAt.getTime();
          const endTime = targetCycle.targetHarvestDate.getTime();
          const span = endTime - startTime;
          if (span <= 0) return null;
          return {
            label: "Target (ABW)",
            tone: "muted" as const,
            dashed: true,
            points: targetGrowth.points.map((point) => {
              const progress = Math.min(
                1,
                Math.max(0, (point.sampledAt.getTime() - startTime) / span),
              );
              return {
                date: point.sampledAt,
                value:
                  firstPoint.averageWeightG +
                  (targetCycle.targetAverageWeightG! - firstPoint.averageWeightG) * progress,
              };
            }),
          };
        })()
      : null;
  const combinedChartSeries = targetChartSeries
    ? [...chartSeries, targetChartSeries]
    : chartSeries;

  return (
    <AppFrame
      active="dashboard"
      ownerName={dashboard.ownerName}
      alertCount={alertCount}
      activePonds={dashboard.activePonds}
    >
      <div className="opsPage dashboardPage">
        <div className="pageTitleRow">
          <div>
            <h1>Dashboard Farm</h1>
            <p>Ringkasan operasional hari ini</p>
          </div>
        </div>

        <section className="summaryStrip" aria-label="Ringkasan farm">
          <article>
            <span className="summaryIcon blue"><InputIcon size={16} /></span>
            <div><span>Kolam Aktif</span><strong>{number0.format(dashboard.activePonds)}</strong><small>kolam</small></div>
          </article>
          <article>
            <span className="summaryIcon cyan"><SamplingIcon size={16} /></span>
            <div><span>Ikan Aktif</span><strong>{number0.format(dashboard.activeFish)}</strong><small>ekor</small></div>
          </article>
          <article>
            <span className="summaryIcon green"><HarvestIcon size={16} /></span>
            <div><span>Biomassa</span><strong>{number1.format(dashboard.estimatedBiomassKg)}</strong><small>kg</small></div>
          </article>
          <article>
            <span className="summaryIcon teal"><CostIcon size={16} /></span>
            <div><span>Biaya Berjalan</span><strong>{compactCurrency(dashboard.runningCost)}</strong></div>
          </article>
        </section>

        <section className={`attentionStrip ${attentionCycle ? "hasAttention" : "allClear"}`} id="attention">
          <div className="attentionLead">
            <span className="attentionIcon"><AlertTriangleIcon size={17} /></span>
            <div>
              <strong>{attentionCycle ? "Perlu Perhatian" : "Kondisi Farm Baik"}</strong>
              <small>{attentionCycle ? "Kinerja di bawah target" : "Tidak ada alert aktif"}</small>
              <Link href={attentionCycle ? `/ponds/${encodeURIComponent(attentionCycle.pondCode)}` : "/"}>
                {attentionCycle ? `${attentionCycle.pondCode} — ${attentionCycle.species}` : dashboard.farmName}
              </Link>
            </div>
          </div>
          {attentionCycle ? (
            <div className="attentionMetrics">
              <div><span>SR Saat Ini</span><strong>{formatPct(attentionCycle.survivalRatePct)}</strong></div>
              <div><span>Target SR</span><strong>{formatPct(attentionCycle.targetSrPct)}</strong></div>
              <div><span>Status</span><b className={`statusBadge ${statusClass(attentionCycle.status)}`}>{statusLabel(attentionCycle.status)}</b></div>
              <Link className="attentionArrow" href={`/ponds/${encodeURIComponent(attentionCycle.pondCode)}`} aria-label={`Lihat ${attentionCycle.pondCode}`}>›</Link>
            </div>
          ) : null}
        </section>

        <section className="workspaceSection">
          <h2>Cycle Overview</h2>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Kolam</th>
                  <th>Jenis Ikan</th>
                  <th>Hari</th>
                  <th>SR</th>
                  <th>FCR</th>
                  <th>ABW</th>
                  <th>Biomassa</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.cycles.map((cycle) => (
                  <tr key={cycle.cycleId}>
                    <td><Link className={cycle.status === "ON_TARGET" ? "tablePondLink" : "tablePondLink warningText"} href={`/ponds/${encodeURIComponent(cycle.pondCode)}`}>{cycle.pondCode}</Link></td>
                    <td>{cycle.species}</td>
                    <td>{cycle.day}</td>
                    <td className={cycle.survivalRatePct !== null && cycle.targetSrPct !== null && cycle.survivalRatePct < cycle.targetSrPct ? "warningText strongCell" : "goodText strongCell"}>{formatPct(cycle.survivalRatePct)}</td>
                    <td>{formatFcr(cycle.fcr)}</td>
                    <td>{cycle.averageWeightG === null ? "—" : `${number0.format(cycle.averageWeightG)} g`}</td>
                    <td>{cycle.estimatedBiomassKg === null ? "—" : `${number1.format(cycle.estimatedBiomassKg)} kg`}</td>
                    <td><span className={`statusBadge ${statusClass(cycle.status)}`}>{statusLabel(cycle.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="dashboardLowerGrid">
          <section className="workspaceCard chartCard">
            <h2>Trend Pertumbuhan (ABW)</h2>
            <GrowthChart series={combinedChartSeries} height={265} />
          </section>

          <section className="workspaceCard activityCard">
            <h2>Aktivitas Hari Ini</h2>
            <div className="activityList">
              {dashboard.recentActivity.slice(0, 3).map((activity) => (
                <article className="activityRow" key={activity.id}>
                  <span className={`activityIcon ${activity.type.toLowerCase()}`}>
                    {activity.type === "SAMPLING" ? <SamplingIcon size={15} /> : activity.type === "FEED" ? <HarvestIcon size={15} /> : <CostIcon size={15} />}
                  </span>
                  <div>
                    <strong>{activity.type === "SAMPLING" ? `Sampling ${activity.pondCode}` : activity.type === "FEED" ? "Pemberian pakan" : "Input biaya operasional"}</strong>
                    <span>
                      {activity.type === "SAMPLING"
                        ? `${number0.format(activity.sampleCount ?? 0)} sampel · ${number0.format(activity.averageWeightG ?? 0)} g`
                        : activity.type === "FEED"
                          ? `${activity.pondCode} · ${number1.format(activity.quantityKg ?? 0)} kg`
                          : currency.format(activity.amount ?? 0)}
                    </span>
                  </div>
                  <time>{activityWhen(activity.occurredAt, now)}</time>
                </article>
              ))}
              {dashboard.recentActivity.length === 0 ? <p className="mutedEmpty">Belum ada aktivitas terbaru.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </AppFrame>
  );
}
