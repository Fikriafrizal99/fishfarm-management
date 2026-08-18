import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitSampling } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function SamplingPage({
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
            <p className="workspaceKicker">BUDIDAYA / BIOLOGI</p>
            <h1>Sampling</h1>
            <p>Perbarui bobot rata-rata, biomassa, populasi teramati, dan tren pertumbuhan.</p>
          </div>
          <div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus aktif</span></div>
        </div>

        <BudidayaWorkspaceNav active="sampling" />

        {params.saved === "1" ? <div className="notice successNotice">Sampling berhasil disimpan. KPI sudah dihitung ulang.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung. Form akan aktif setelah development database dijalankan.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitSampling} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader">
              <div><span>NEW OBSERVATION</span><h2>Catat hasil sampling</h2></div>
              <small>Observed data</small>
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
                <label><span>Tanggal sampling</span><input name="sampledDate" type="date" defaultValue={todayInJakarta()} required /></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Hasil sampel</h3>
              <div className="compactFieldGrid two">
                <label><span>Jumlah ikan sampel</span><div className="compactUnitInput"><input name="sampleCount" type="number" min="1" step="1" placeholder="30" required /><b>ekor</b></div></label>
                <label><span>Total berat sampel</span><div className="compactUnitInput"><input name="totalSampleWeightKg" type="number" min="0.001" step="0.001" placeholder="8.1" /><b>kg</b></div></label>
                <label><span>Bobot rata-rata</span><div className="compactUnitInput"><input name="averageWeightG" type="number" min="0.001" step="0.001" placeholder="270" /><b>g</b></div></label>
                <label><span>Panjang rata-rata</span><div className="compactUnitInput"><input name="averageLengthCm" type="number" min="0.001" step="0.001" placeholder="18.5" /><b>cm</b></div></label>
              </div>
              <label><span>Populasi teramati (opsional)</span><div className="compactUnitInput"><input name="observedPopulation" type="number" min="1" step="1" placeholder="Isi jika ada penghitungan populasi" /><b>ekor</b></div></label>
            </div>

            <div className="formSectionBlock">
              <h3>Catatan lapangan</h3>
              <label><span>Catatan sampling</span><textarea name="notes" rows={3} placeholder="Ukuran relatif seragam, nafsu makan baik, tidak ada luka terlihat" /></label>
            </div>

            <div className="workspaceInlineNotice neutral">
              <strong>Validasi sampling:</strong>
              <span>isi minimal total berat sampel atau bobot rata-rata. Jika keduanya diisi, server mengecek konsistensinya.</span>
            </div>

            <div className="workspaceFormActions">
              <span>Data tersimpan sebagai observed measurement.</span>
              <button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Sampling</button>
            </div>
          </form>

          <aside className="operationContextStack">
            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>AFTER SAVE</span><h2>KPI yang diperbarui</h2></div></div>
              <div className="contextMetricList">
                <div><span>ABW</span><strong>Observed</strong></div>
                <div><span>Biomassa</span><strong>Estimated</strong></div>
                <div><span>FCR</span><strong>Recalculated</strong></div>
                <div><span>Growth trend</span><strong>Updated</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
