import Link from "next/link";
import { getPondDetail } from "@/src/application/ponds/get-pond-detail";
import { AppFrame } from "@/app/_components/app-frame";
import { GrowthChart } from "@/app/_components/growth-chart";
import {
  CostIcon,
  HarvestIcon,
  SamplingIcon,
} from "@/app/_components/icons";

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
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pct(value: number | null): string {
  return value === null ? "—" : `${number1.format(value)}%`;
}

function fcr(value: number | null): string {
  return value === null ? "—" : number2.format(value);
}

function statusLabel(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION" | "COMPLETED") {
  if (status === "ON_TARGET") return "ON TARGET";
  if (status === "NEEDS_ATTENTION") return "NEEDS ATTENTION";
  if (status === "COMPLETED") return "COMPLETED";
  return "MONITOR";
}

function statusClass(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION" | "COMPLETED") {
  if (status === "ON_TARGET" || status === "COMPLETED") return "good";
  if (status === "NEEDS_ATTENTION") return "danger";
  return "warning";
}

function expenseLabel(category: string): string {
  const labels: Record<string, string> = {
    SEED: "Benih",
    FEED: "Pakan",
    MEDICINE: "Obat & Vitamin",
    PROBIOTIC: "Probiotik",
    ELECTRICITY: "Listrik & Pompa",
    WATER: "Air",
    LABOR: "Tenaga kerja",
    MAINTENANCE: "Maintenance",
    TRANSPORT: "Transport",
    HARVEST: "Panen",
    OTHER: "Lain-lain",
  };
  return labels[category] ?? category;
}

function activityWhen(date: Date, now: Date): string {
  const currentKey = dayKeyFormatter.format(now);
  const activityKey = dayKeyFormatter.format(date);
  if (activityKey === currentKey) return `Hari ini, ${timeFormatter.format(date)}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (activityKey === dayKeyFormatter.format(yesterday)) return `Kemarin, ${timeFormatter.format(date)}`;
  return shortDateFormatter.format(date);
}

export default async function PondDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ pondCode: string }>;
  searchParams: Promise<{ harvestSaved?: string }>;
}) {
  const { pondCode } = await params;
  const query = await searchParams;

  let detail: Awaited<ReturnType<typeof getPondDetail>> = null;
  let databaseUnavailable = false;

  try {
    detail = await getPondDetail(decodeURIComponent(pondCode));
  } catch {
    databaseUnavailable = true;
  }

  if (!detail) {
    return (
      <main className="shell formShell">
        <div className="topBar"><Link className="backLink" href="/">← Dashboard</Link></div>
        <section className="panel emptyState">
          <p className="eyebrow dark">Detail Kolam</p>
          <h1>{databaseUnavailable ? "Database belum tersambung" : "Kolam tidak ditemukan"}</h1>
          <p>{databaseUnavailable ? "Jalankan development database terlebih dahulu." : "Pastikan kode kolam tersedia di database."}</p>
        </section>
      </main>
    );
  }

  const isCompleted = detail.status === "COMPLETED";
  const now = new Date();
  const dimensionText = [
    detail.dimensions.lengthM,
    detail.dimensions.widthM,
    detail.dimensions.depthM,
  ].every((value) => value !== null)
    ? `${detail.dimensions.lengthM} × ${detail.dimensions.widthM} × ${detail.dimensions.depthM} m`
    : "Belum lengkap";

  const observedSeries = {
    label: "ABW (g)",
    tone: "teal" as const,
    points: detail.samplingTrend.map((point) => ({
      date: point.sampledAt,
      value: point.averageWeightG,
      label: `${number0.format(point.averageWeightG)}g`,
    })),
  };

  const targetSeries =
    !isCompleted &&
    detail.targetAverageWeightG !== null &&
    detail.targetHarvestDate !== null &&
    detail.samplingTrend.length >= 2
      ? (() => {
          const firstPoint = detail.samplingTrend[0];
          const startTime = firstPoint.sampledAt.getTime();
          const endTime = detail.targetHarvestDate.getTime();
          const span = endTime - startTime;
          if (span <= 0) return null;
          return {
            label: "Target ABW estimasi",
            tone: "muted" as const,
            dashed: true,
            points: detail.samplingTrend.map((point) => {
              const progress = Math.min(
                1,
                Math.max(0, (point.sampledAt.getTime() - startTime) / span),
              );
              return {
                date: point.sampledAt,
                value:
                  firstPoint.averageWeightG +
                  (detail.targetAverageWeightG! - firstPoint.averageWeightG) * progress,
              };
            }),
          };
        })()
      : null;

  const expenseRows = detail.expenseBreakdown.slice(0, 4);

  return (
    <AppFrame active="budidaya" ownerName={null} alertCount={detail.alerts.length} compact>
      <div className="opsPage pondDetailPage">
        <Link className="detailBackLink" href="/budidaya">← Kembali ke Budidaya</Link>

        {query.harvestSaved === "1" ? (
          <div className="notice successNotice">Panen berhasil disimpan. KPI finansial dan biologis sudah dihitung ulang.</div>
        ) : null}

        <div className="detailTitleRow">
          <div>
            <div className="titleWithStatus">
              <h1>{detail.pondCode} — {detail.species}</h1>
              <span className={`statusBadge ${statusClass(detail.status)}`}>{statusLabel(detail.status)}</span>
            </div>
            <p>{detail.pondName ?? "Kolam budidaya"} · Hari ke-{detail.day} · {detail.cycleCode}</p>
          </div>
        </div>

        <section className="detailMetricStrip" aria-label={isCompleted ? "Hasil final siklus" : "KPI kolam"}>
          {isCompleted ? (
            <>
              <div><span>Final SR</span><strong>{pct(detail.survivalRatePct)}</strong></div>
              <div><span>Total Panen</span><strong>{number1.format(detail.harvestedBiomassKg)} kg</strong></div>
              <div><span>Actual HPP</span><strong>{detail.actualHppPerKg === null ? "—" : currency.format(detail.actualHppPerKg)}</strong></div>
              <div><span>Laba Bersih</span><strong>{detail.netProfit === null ? "—" : currency.format(detail.netProfit)}</strong></div>
            </>
          ) : (
            <>
              <div><span>Estimated SR</span><strong>{pct(detail.survivalRatePct)}</strong></div>
              <div><span>ABW Terakhir</span><strong>{detail.latestAverageWeightG === null ? "—" : `${number0.format(detail.latestAverageWeightG)} g`}</strong></div>
              <div><span>Estimasi Biomassa</span><strong>{detail.estimatedBiomassKg === null ? "—" : `${number1.format(detail.estimatedBiomassKg)} kg`}</strong></div>
              <div><span>FCR</span><strong>{fcr(detail.fcr)}</strong></div>
            </>
          )}
        </section>

        <section className="operationalGridCard">
          <div className="operationalGroup">
            <h3>Populasi</h3>
            <dl>
              <div><dt>Ikan Tebar</dt><dd>{number0.format(detail.stockedFish)} ekor</dd></div>
              <div><dt>{isCompleted ? "Sisa Populasi" : "Estimasi Hidup"}</dt><dd>{number0.format(detail.estimatedPopulation)} ekor</dd></div>
              <div><dt>Mortalitas</dt><dd>{number0.format(detail.mortalityFish)} ekor · {pct(detail.mortalityRatePct)}</dd></div>
            </dl>
          </div>
          <div className="operationalGroup">
            <h3>Performa</h3>
            <dl>
              <div><dt>Pakan Kumulatif</dt><dd>{number1.format(detail.cumulativeFeedKg)} kg</dd></div>
              <div><dt>Target FCR</dt><dd>{fcr(detail.targetFcr)}</dd></div>
              <div><dt>Target SR</dt><dd>{pct(detail.targetSrPct)}</dd></div>
            </dl>
          </div>
          <div className="operationalGroup">
            <h3>Kolam</h3>
            <dl>
              <div><dt>Ukuran Kolam</dt><dd>{dimensionText}</dd></div>
              <div><dt>Jenis Kolam</dt><dd>{detail.pondType ?? "—"}</dd></div>
            </dl>
          </div>
        </section>

        <section className="workspaceCard pondChartCard">
          <div className="sectionHeaderInline">
            <h2>Perkembangan Bobot Sampling</h2>
          </div>
          <GrowthChart series={targetSeries ? [observedSeries, targetSeries] : [observedSeries]} height={285} showPointLabels />
          <div className="sampleCountRow" aria-label="Jumlah sampel">
            {detail.samplingTrend.map((point) => <span key={point.id}>{number0.format(point.sampleCount)} sampel</span>)}
          </div>
        </section>

        <div className="pondBottomGrid">
          <section className="workspaceCard miniWorkspaceCard">
            <div className="sectionHeaderInline"><h2>Aktivitas Terbaru</h2></div>
            <div className="activityList pondActivityList">
              {detail.recentActivity.slice(0, 3).map((activity) => (
                <article className="activityRow" key={activity.id}>
                  <span className={`activityIcon ${activity.type.toLowerCase()}`}>
                    {activity.type === "SAMPLING" ? <SamplingIcon size={15} /> : activity.type === "FEED" ? <HarvestIcon size={15} /> : <CostIcon size={15} />}
                  </span>
                  <div><strong>{activity.title}</strong><span>{activity.detail}</span></div>
                  <time>{activityWhen(activity.occurredAt, now)}</time>
                </article>
              ))}
              {detail.recentActivity.length === 0 ? <p className="mutedEmpty">Belum ada aktivitas terbaru.</p> : null}
            </div>
          </section>

          <section className="workspaceCard miniWorkspaceCard">
            <div className="sectionHeaderInline"><h2>{isCompleted ? "Biaya Final" : "Biaya Berjalan"}</h2></div>
            <div className="compactExpenseList">
              {expenseRows.map((expense) => (
                <div key={expense.category}><span>{expenseLabel(expense.category)}</span><strong>{currency.format(expense.amount)}</strong></div>
              ))}
              {expenseRows.length === 0 ? <p className="mutedEmpty">Belum ada biaya tercatat.</p> : null}
              <div className="expenseTotal"><span>Total</span><strong>{currency.format(detail.totalCost)}</strong></div>
            </div>
          </section>

          <section className="workspaceCard miniWorkspaceCard" id="attention">
            <h2>Alert & Catatan</h2>
            <div className="alertNoteList">
              {detail.alerts.slice(0, 1).map((alert) => (
                <article className="compactAlert" key={alert.id}>
                  <span className="alertDot">!</span>
                  <div><strong>{alert.title}</strong><p>{alert.message}</p><small>{shortDateFormatter.format(alert.triggeredAt)}</small></div>
                </article>
              ))}
              {detail.alerts.length === 0 ? (
                <article className="compactAlert clearAlert"><span className="alertDot">✓</span><div><strong>Tidak ada alert aktif</strong><p>Kondisi siklus saat ini tidak memiliki warning terbuka.</p></div></article>
              ) : null}
              {detail.latestNote ? (
                <article className="compactNote">
                  <span>✎</span>
                  <div><strong>Catatan</strong><p>{detail.latestNote.text}</p><small>{shortDateFormatter.format(detail.latestNote.occurredAt)}</small></div>
                </article>
              ) : null}
            </div>
          </section>
        </div>

        {isCompleted ? (
          <section className="workspaceCard completedSummary">
            <div className="sectionHeaderInline"><h2>Hasil Aktual Siklus</h2><span className="statusBadge good">ACTUAL</span></div>
            <div className="completedGrid">
              <div><span>Omzet</span><strong>{currency.format(detail.revenueAmount)}</strong></div>
              <div><span>Total biaya</span><strong>{currency.format(detail.totalCost)}</strong></div>
              <div><span>Net profit</span><strong>{detail.netProfit === null ? "—" : currency.format(detail.netProfit)}</strong></div>
              <div><span>Margin</span><strong>{pct(detail.marginPct)}</strong></div>
              <div><span>Final FCR</span><strong>{fcr(detail.fcr)}</strong></div>
              <div><span>Selesai</span><strong>{detail.completedAt === null ? "—" : dateFormatter.format(detail.completedAt)}</strong></div>
            </div>
          </section>
        ) : null}
      </div>
    </AppFrame>
  );
}
