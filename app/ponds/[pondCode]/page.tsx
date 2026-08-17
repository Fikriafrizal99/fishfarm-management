import Link from "next/link";
import { getPondDetail } from "@/src/application/ponds/get-pond-detail";

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

function pct(value: number | null): string {
  return value === null ? "—" : `${number1.format(value)}%`;
}

function fcr(value: number | null): string {
  return value === null ? "—" : number2.format(value);
}

function statusLabel(status: "ON_TARGET" | "MONITOR" | "NEEDS_ATTENTION") {
  if (status === "ON_TARGET") return "ON TARGET";
  if (status === "NEEDS_ATTENTION") return "NEEDS ATTENTION";
  return "MONITOR";
}

function expenseLabel(category: string): string {
  const labels: Record<string, string> = {
    SEED: "Benih",
    FEED: "Pakan",
    MEDICINE: "Obat",
    PROBIOTIC: "Probiotik",
    ELECTRICITY: "Listrik",
    WATER: "Air",
    LABOR: "Tenaga kerja",
    MAINTENANCE: "Maintenance",
    TRANSPORT: "Transport",
    HARVEST: "Panen",
    OTHER: "Lainnya",
  };
  return labels[category] ?? category;
}

export default async function PondDetailPage({
  params,
}: {
  params: Promise<{ pondCode: string }>;
}) {
  const { pondCode } = await params;

  let detail: Awaited<ReturnType<typeof getPondDetail>> = null;
  let databaseUnavailable = false;

  try {
    detail = await getPondDetail(decodeURIComponent(pondCode));
  } catch {
    databaseUnavailable = true;
  }

  if (!detail) {
    return (
      <main className="shell">
        <div className="topBar">
          <Link className="backLink" href="/">← Dashboard</Link>
        </div>
        <section className="panel emptyState">
          <p className="eyebrow dark">Detail Kolam</p>
          <h1>{databaseUnavailable ? "Database belum tersambung" : "Kolam tidak ditemukan"}</h1>
          <p>
            {databaseUnavailable
              ? "Jalankan development database terlebih dahulu saat laptop sudah tersedia."
              : "Pastikan kode kolam dan siklus sudah tersedia di database."}
          </p>
        </section>
      </main>
    );
  }

  const maxAverageWeight = Math.max(
    ...detail.samplingTrend.map((point) => point.averageWeightG),
    1,
  );

  const dimensionText = [
    detail.dimensions.lengthM,
    detail.dimensions.widthM,
    detail.dimensions.depthM,
  ].every((value) => value !== null)
    ? `${detail.dimensions.lengthM} × ${detail.dimensions.widthM} × ${detail.dimensions.depthM} m`
    : "Belum lengkap";

  return (
    <main className="shell detailShell">
      <div className="topBar">
        <Link className="backLink" href="/">← Dashboard</Link>
        <span
          className={`badge ${
            detail.status === "ON_TARGET"
              ? "good"
              : detail.status === "NEEDS_ATTENTION"
                ? "danger"
                : "warning"
          }`}
        >
          {statusLabel(detail.status)}
        </span>
      </div>

      <header className="detailHero">
        <div>
          <p className="eyebrow">{detail.farmName}</p>
          <h1>{detail.pondCode} — {detail.species}</h1>
          <p>
            {detail.pondName ?? "Kolam budidaya"} · Hari ke-{detail.day} · {detail.cycleCode}
          </p>
        </div>
        <div className="heroActions">
          <Link className="secondaryButton lightButton" href={`/sampling?cycleId=${detail.cycleId}`}>
            + Sampling
          </Link>
          <Link className="heroAction" href={`/input?cycleId=${detail.cycleId}`}>
            + Input Harian
          </Link>
        </div>
      </header>

      <section className="metrics pondMetrics" aria-label="KPI kolam">
        <article><span>Estimated SR</span><strong>{pct(detail.survivalRatePct)}</strong></article>
        <article><span>ABW Terakhir</span><strong>{detail.latestAverageWeightG === null ? "—" : `${number0.format(detail.latestAverageWeightG)} g`}</strong></article>
        <article><span>Estimasi Biomassa</span><strong>{detail.estimatedBiomassKg === null ? "—" : `${number1.format(detail.estimatedBiomassKg)} kg`}</strong></article>
        <article><span>FCR</span><strong>{fcr(detail.fcr)}</strong></article>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Kondisi Siklus</p>
            <h2>Ringkasan operasional & biologis</h2>
          </div>
          <span className="badge good">{detail.populationSource}</span>
        </div>

        <div className="detailGrid">
          <div><span>Ikan tebar</span><strong>{number0.format(detail.stockedFish)} ekor</strong></div>
          <div><span>Estimasi hidup</span><strong>{number0.format(detail.estimatedPopulation)} ekor</strong></div>
          <div><span>Mortalitas</span><strong>{number0.format(detail.mortalityFish)} ekor · {pct(detail.mortalityRatePct)}</strong></div>
          <div><span>Pakan kumulatif</span><strong>{number1.format(detail.cumulativeFeedKg)} kg</strong></div>
          <div><span>Target FCR</span><strong>{fcr(detail.targetFcr)}</strong></div>
          <div><span>Target SR</span><strong>{pct(detail.targetSrPct)}</strong></div>
          <div><span>Ukuran kolam</span><strong>{dimensionText}</strong></div>
          <div><span>Jenis kolam</span><strong>{detail.pondType ?? "—"}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Growth Trend</p>
            <h2>Perkembangan bobot sampling</h2>
          </div>
          <Link className="textLink" href={`/sampling?cycleId=${detail.cycleId}`}>Tambah sampling →</Link>
        </div>

        {detail.samplingTrend.length === 0 ? (
          <div className="emptyInline">Belum ada data sampling.</div>
        ) : (
          <div className="growthList">
            {detail.samplingTrend.map((point) => (
              <div className="growthRow" key={point.id}>
                <div className="growthMeta">
                  <strong>{number0.format(point.averageWeightG)} g</strong>
                  <span>{dateFormatter.format(point.sampledAt)} · {point.sampleCount} sampel</span>
                </div>
                <div className="growthTrack" aria-hidden="true">
                  <div
                    className="growthBar"
                    style={{ width: `${Math.max(5, (point.averageWeightG / maxAverageWeight) * 100)}%` }}
                  />
                </div>
                <div className="growthDelta">
                  <span>{point.weightGainG === null ? "Baseline" : `+${number1.format(point.weightGainG)} g`}</span>
                  <strong>{point.adgGPerDay === null ? "—" : `${number2.format(point.adgGPerDay)} g/hari`}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="twoColumn">
        <article className="panel financeCard">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Keuangan</p>
              <h2>Biaya siklus</h2>
            </div>
          </div>
          <div className="moneyHero">{currency.format(detail.totalCost)}</div>
          <p className="metricDisclaimer">
            Biaya per estimasi standing kg: {detail.currentCostPerStandingKg === null ? "—" : currency.format(detail.currentCostPerStandingKg)}
          </p>
          <div className="expenseList">
            {detail.expenseBreakdown.map((expense) => (
              <div key={expense.category}>
                <span>{expenseLabel(expense.category)}</span>
                <strong>{currency.format(expense.amount)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel financeCard">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Target Panen</p>
              <h2>Progress siklus</h2>
            </div>
          </div>
          <div className="detailGrid compactGrid">
            <div><span>Target biomassa</span><strong>{detail.targetHarvestWeightKg === null ? "—" : `${number1.format(detail.targetHarvestWeightKg)} kg`}</strong></div>
            <div><span>Target tanggal</span><strong>{detail.targetHarvestDate === null ? "—" : dateFormatter.format(detail.targetHarvestDate)}</strong></div>
            <div><span>Sisa hari</span><strong>{detail.daysToTargetHarvest === null ? "—" : detail.daysToTargetHarvest < 0 ? `Lewat ${Math.abs(detail.daysToTargetHarvest)} hari` : `${detail.daysToTargetHarvest} hari`}</strong></div>
            <div><span>Status siklus</span><strong>{detail.cycleStatus}</strong></div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Decision Signals</p>
            <h2>Alert aktif</h2>
          </div>
          <span>{detail.alerts.length} alert</span>
        </div>

        {detail.alerts.length === 0 ? (
          <div className="emptyInline">Tidak ada alert aktif untuk siklus ini.</div>
        ) : (
          <div className="alertList">
            {detail.alerts.map((alert) => (
              <article className={`alertCard ${alert.severity === "ACTION_REQUIRED" ? "alertDanger" : ""}`} key={alert.id}>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
                {alert.recommendedAction ? <span>Rekomendasi: {alert.recommendedAction}</span> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>V0.5 · Detail kolam menghitung KPI dan growth trend langsung dari raw records.</footer>
    </main>
  );
}
