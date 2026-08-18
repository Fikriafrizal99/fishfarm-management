import Link from "next/link";
import { AppFrame } from "@/app/_components/app-frame";
import { UtilityWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { CostIcon, FarmIcon, GridIcon } from "@/app/_components/icons";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;

  try {
    shell = await getAppShellContext();
  } catch {
    shell = null;
  }

  return (
    <AppFrame
      active="lainnya"
      ownerName={shell?.ownerName ?? null}
      alertCount={shell?.openAlertCount ?? 0}
      activePonds={shell?.activePonds}
    >
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow">
          <div>
            <p className="workspaceKicker">UTILITY & INSIGHT</p>
            <h1>Lainnya</h1>
            <p>Riwayat, laporan, dan utilitas sistem yang tidak menduplikasi menu Budidaya atau Sales CRM.</p>
          </div>
        </div>

        <UtilityWorkspaceNav active="overview" />

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">INSIGHT</p><h2>Riwayat & laporan</h2></div></div>
          <div className="moduleLinkGrid">
            <Link href="/history"><GridIcon size={18} /><div><strong>Riwayat</strong><span>Jejak siklus produksi dan transaksi komersial.</span></div><b>→</b></Link>
            <Link href="/reports"><CostIcon size={18} /><div><strong>Laporan</strong><span>Ringkasan performa produksi, sales, collection, dan customer.</span></div><b>→</b></Link>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">SYSTEM</p><h2>Utilitas</h2></div></div>
          <div className="moduleLinkGrid oneColumnModules">
            <Link href="/api/health/db"><FarmIcon size={18} /><div><strong>Database Health</strong><span>Cek koneksi PostgreSQL dan data dasar aplikasi.</span></div><b>→</b></Link>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
