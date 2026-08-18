import Link from "next/link";
import { AppFrame } from "@/app/_components/app-frame";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { BellIcon, CostIcon, FarmIcon, HarvestIcon, InputIcon, SalesIcon, SamplingIcon } from "@/app/_components/icons";

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
      <div className="opsPage">
        <div className="pageTitleRow">
          <div>
            <h1>Lainnya</h1>
            <p>Akses modul dan utilitas FishFarm Management</p>
          </div>
        </div>

        <section className="workspaceCard moduleMenuCard">
          <h2>Budidaya</h2>
          <div className="moduleLinkGrid">
            <Link href="/budidaya"><FarmIcon size={18} /><div><strong>Kolam & Siklus</strong><span>Monitor seluruh siklus budidaya aktif.</span></div><b>→</b></Link>
            <Link href="/input"><InputIcon size={18} /><div><strong>Input Harian</strong><span>Pakan, mortalitas, dan kondisi harian.</span></div><b>→</b></Link>
            <Link href="/sampling"><SamplingIcon size={18} /><div><strong>Sampling</strong><span>Catat ABW dan perkembangan biologis.</span></div><b>→</b></Link>
            <Link href="/harvest"><HarvestIcon size={18} /><div><strong>Panen</strong><span>Panen parsial/final dan penciptaan HarvestLot.</span></div><b>→</b></Link>
            <Link href="/expenses"><CostIcon size={18} /><div><strong>Biaya</strong><span>Catat pengeluaran operasional tambahan.</span></div><b>→</b></Link>
            <Link href="/alerts"><BellIcon size={18} /><div><strong>Alert</strong><span>Peringatan dan rekomendasi Decision Engine.</span></div><b>→</b></Link>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <h2>Sales & CRM</h2>
          <div className="moduleLinkGrid">
            <Link href="/sales"><SalesIcon size={18} /><div><strong>Sales Dashboard</strong><span>Pipeline, order, piutang, dan harvest stock.</span></div><b>→</b></Link>
            <Link href="/sales/leads"><SalesIcon size={18} /><div><strong>Leads</strong><span>Calon pembeli dan follow-up.</span></div><b>→</b></Link>
            <Link href="/sales/customers"><SalesIcon size={18} /><div><strong>Customers</strong><span>Database customer komersial.</span></div><b>→</b></Link>
            <Link href="/sales/orders"><SalesIcon size={18} /><div><strong>Orders</strong><span>Sales order terkonfirmasi.</span></div><b>→</b></Link>
            <Link href="/sales/fulfillment"><SalesIcon size={18} /><div><strong>Fulfillment</strong><span>Alokasi HarvestLot ke order.</span></div><b>→</b></Link>
          </div>
        </section>

        <section className="workspaceCard moduleMenuCard">
          <h2>Sistem</h2>
          <div className="moduleLinkGrid oneColumnModules">
            <Link href="/api/health/db"><FarmIcon size={18} /><div><strong>Database Health</strong><span>Cek koneksi PostgreSQL dan data dasar aplikasi.</span></div><b>→</b></Link>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
