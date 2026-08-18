import Link from "next/link";
import { getAlertCenter } from "@/src/application/alerts/get-alert-center";
import { AppFrame } from "@/app/_components/app-frame";
import { BellIcon } from "@/app/_components/icons";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function severityClass(severity: string) {
  if (severity === "ACTION_REQUIRED") return "danger";
  if (severity === "WARNING") return "warning";
  return "good";
}

function severityLabel(severity: string) {
  if (severity === "ACTION_REQUIRED") return "ACTION REQUIRED";
  if (severity === "WARNING") return "WARNING";
  return "INFO";
}

export default async function AlertsPage() {
  let data: Awaited<ReturnType<typeof getAlertCenter>> = null;

  try {
    data = await getAlertCenter();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <main className="shell formShell">
        <section className="panel emptyState">
          <p className="eyebrow dark">Alert</p>
          <h1>Pusat alert belum tersedia</h1>
          <p>Pastikan development database aktif lalu refresh halaman.</p>
        </section>
      </main>
    );
  }

  return (
    <AppFrame
      active="alert"
      ownerName={data.shell.ownerName}
      alertCount={data.shell.openAlertCount}
      activePonds={data.shell.activePonds}
    >
      <div className="opsPage">
        <div className="pageTitleRow">
          <div>
            <h1>Alert</h1>
            <p>Prioritas keputusan dari Decision Engine</p>
          </div>
          <Link className="actionButton" href="/budidaya">Lihat Budidaya</Link>
        </div>

        <section className="summaryStrip alertSummaryStrip" aria-label="Ringkasan alert">
          <article><span className="summaryIcon"><BellIcon size={16} /></span><div><span>Alert Terbuka</span><strong>{data.open.length}</strong></div></article>
          <article><div><span>Riwayat</span><strong>{data.history.length}</strong><small>resolved/ack</small></div></article>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><h2>Perlu Ditindaklanjuti</h2><span className="mutedInline">{data.open.length} terbuka</span></div>
          <div className="alertCenterList">
            {data.open.length === 0 ? (
              <div className="emptyInline">Tidak ada alert aktif. Semua siklus saat ini berada di kondisi tanpa warning terbuka.</div>
            ) : data.open.map((alert) => (
              <Link className="alertCenterRow" href={`/ponds/${encodeURIComponent(alert.cycle.pond.code)}`} key={alert.id}>
                <span className={`alertCenterMark ${severityClass(alert.severity)}`}>!</span>
                <div>
                  <div className="alertCenterTitle"><strong>{alert.title}</strong><i className={`statusBadge ${severityClass(alert.severity)}`}>{severityLabel(alert.severity)}</i></div>
                  <p>{alert.message}</p>
                  {alert.recommendedAction ? <small>Tindakan: {alert.recommendedAction}</small> : null}
                </div>
                <div className="alertCenterMeta">
                  <strong>{alert.cycle.pond.code}</strong>
                  <span>{alert.cycle.species.commonName}</span>
                  <time>{dateTimeFormatter.format(alert.triggeredAt)}</time>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><h2>Riwayat Alert</h2><span className="mutedInline">50 data terbaru maksimal</span></div>
          <div className="alertCenterList compactHistory">
            {data.history.length === 0 ? (
              <div className="emptyInline">Belum ada alert yang diselesaikan.</div>
            ) : data.history.map((alert) => (
              <div className="alertCenterRow historyRow" key={alert.id}>
                <span className="alertCenterMark good">✓</span>
                <div><strong>{alert.title}</strong><p>{alert.cycle.pond.code} · {alert.cycle.species.commonName}</p></div>
                <div className="alertCenterMeta"><span>{alert.status}</span><time>{dateTimeFormatter.format(alert.triggeredAt)}</time></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
