import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitDailyInput } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function InputPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; cycleId?: string }>;
}) {
  const params = await searchParams;
  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let databaseError = false;

  try {
    [cycles, shell] = await Promise.all([getActiveCycleOptions(), getAppShellContext()]);
  } catch {
    databaseError = true;
  }

  const selectedCycleId = cycles.some((cycle) => cycle.id === params.cycleId)
    ? params.cycleId
    : "";

  return (
    <AppFrame
      active="budidaya"
      ownerName={shell?.ownerName ?? null}
      alertCount={shell?.openAlertCount ?? 0}
      activePonds={shell?.activePonds}
    >
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow">
          <div>
            <p className="workspaceKicker">BUDIDAYA / DAILY LOG</p>
            <h1>Input Harian</h1>
            <p>Catat pakan, mortalitas, biaya tambahan, dan kondisi lapangan sebagai raw data.</p>
          </div>
          <div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus aktif</span></div>
        </div>

        <BudidayaWorkspaceNav active="input" />

        {params.saved === "1" ? <div className="notice successNotice">Data harian berhasil disimpan.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung. Form akan aktif setelah development database dijalankan.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitDailyInput} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader">
              <div><span>DAILY EVENT</span><h2>Catat kondisi hari ini</h2></div>
              <small>Raw operational data</small>
            </div>

            <div className="formSectionBlock">
              <h3>Siklus & waktu</h3>
              <div className="compactFieldGrid two">
                <label>
                  <span>Kolam / Siklus</span>
                  <select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}>
                    <option value="">Pilih kolam</option>
                    {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
                  </select>
                </label>
                <label><span>Tanggal</span><input name="eventDate" type="date" defaultValue={todayInJakarta()} required /></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Operasional harian</h3>
              <div className="compactFieldGrid two">
                <label><span>Pakan diberikan</span><div className="compactUnitInput"><input name="feedKg" type="number" min="0" step="0.001" placeholder="0" /><b>kg</b></div></label>
                <label><span>Ikan mati</span><div className="compactUnitInput"><input name="mortalityQty" type="number" min="0" step="1" placeholder="0" /><b>ekor</b></div></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Biaya tambahan</h3>
              <div className="compactFieldGrid two">
                <label>
                  <span>Kategori</span>
                  <select name="additionalExpenseCategory" defaultValue="OTHER">
                    <option value="PROBIOTIC">Probiotik</option>
                    <option value="MEDICINE">Obat</option>
                    <option value="ELECTRICITY">Listrik</option>
                    <option value="WATER">Air</option>
                    <option value="LABOR">Tenaga Kerja</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </label>
                <label><span>Nominal</span><div className="compactUnitInput money"><b>Rp</b><input name="additionalExpenseAmount" type="number" min="0" step="1" placeholder="0" /></div></label>
              </div>
              <Link className="contextActionLink inline" href="/expenses">Buka ledger Biaya →</Link>
            </div>

            <div className="formSectionBlock">
              <h3>Catatan lapangan</h3>
              <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ikan aktif, nafsu makan normal, air sedikit keruh, dll." /></label>
            </div>

            <div className="workspaceFormActions">
              <span>Isi minimal satu: pakan, mortalitas, atau biaya tambahan.</span>
              <button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Data Harian</button>
            </div>
          </form>

          <aside className="operationContextStack">
            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>ACTIVE CYCLES</span><h2>Kolam aktif</h2></div></div>
              <div className="cycleQuickList">
                {cycles.map((cycle) => (
                  <Link href={`/ponds/${encodeURIComponent(cycle.pondCode)}`} key={cycle.id}>
                    <div><strong>{cycle.pondCode}</strong><small>{cycle.species}</small></div><b>›</b>
                  </Link>
                ))}
                {cycles.length === 0 ? <div className="recordEmpty">Tidak ada siklus aktif.</div> : null}
              </div>
            </section>

            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>DATA EFFECT</span><h2>Yang berubah</h2></div></div>
              <div className="contextMetricList">
                <div><span>Pakan</span><strong>Cumulative feed</strong></div>
                <div><span>Mortalitas</span><strong>SR & population</strong></div>
                <div><span>Biaya</span><strong>Running cost</strong></div>
                <div><span>Alert</span><strong>Rules re-evaluated</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
