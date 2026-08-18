import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitExpense } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function ExpensesPage({
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
            <p className="workspaceKicker">BUDIDAYA / COST LEDGER</p>
            <h1>Biaya</h1>
            <p>Catat pengeluaran operasional yang menjadi bagian dari running cost dan HPP siklus.</p>
          </div>
          <div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus aktif</span></div>
        </div>

        <BudidayaWorkspaceNav active="expenses" />

        {params.saved === "1" ? <div className="notice successNotice">Biaya berhasil disimpan.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitExpense} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader">
              <div><span>NEW EXPENSE</span><h2>Catat biaya operasional</h2></div>
              <small>Raw production cost</small>
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
                <label><span>Tanggal biaya</span><input name="eventDate" type="date" defaultValue={todayInJakarta()} required /></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Komponen biaya</h3>
              <div className="compactFieldGrid two">
                <label>
                  <span>Kategori</span>
                  <select name="category" defaultValue="OTHER">
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
                <label><span>Nominal biaya</span><div className="compactUnitInput money"><b>Rp</b><input name="amount" type="number" min="1" step="1" placeholder="0" required /></div></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Keterangan</h3>
              <label><span>Catatan biaya</span><textarea name="notes" rows={3} placeholder="Pembelian probiotik, listrik pompa, transport, perbaikan aerasi, dll." /></label>
            </div>

            <div className="workspaceFormActions">
              <span>Expense menambah running cost siklus.</span>
              <button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Biaya</button>
            </div>
          </form>

          <aside className="operationContextStack">
            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>COST EFFECT</span><h2>Dampak pencatatan</h2></div></div>
              <div className="contextMetricList">
                <div><span>Running cost</span><strong>Naik sesuai nominal</strong></div>
                <div><span>Biaya/kg biomassa</span><strong>Recalculated</strong></div>
                <div><span>HPP final</span><strong>Memakai all-in cost</strong></div>
                <div><span>Profit final</span><strong>Revenue − cost</strong></div>
              </div>
            </section>

            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>QUICK ACCESS</span><h2>Kolam aktif</h2></div></div>
              <div className="cycleQuickList">
                {cycles.map((cycle) => (
                  <Link href={`/ponds/${encodeURIComponent(cycle.pondCode)}`} key={cycle.id}>
                    <div><strong>{cycle.pondCode}</strong><small>{cycle.species}</small></div><b>›</b>
                  </Link>
                ))}
                {cycles.length === 0 ? <div className="recordEmpty">Tidak ada siklus aktif.</div> : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
