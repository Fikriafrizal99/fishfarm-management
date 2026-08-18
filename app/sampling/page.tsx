import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getOperationalLogHistory } from "@/src/application/operations/manage-operational-logs";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { correctSampling } from "@/app/_actions/operational-corrections";
import { submitSampling } from "./actions";

export const dynamic = "force-dynamic";
const dateInput = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function decimal(value: unknown): string { return value === null || value === undefined ? "" : String(Number(value)); }

export default async function SamplingPage({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string; error?: string; cycleId?: string; edit?: string }> }) {
  const params = await searchParams;
  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getOperationalLogHistory>> = null;
  let databaseError = false;
  try { [cycles, shell, history] = await Promise.all([getActiveCycleOptions(), getAppShellContext(), getOperationalLogHistory()]); } catch { databaseError = true; }

  const editLog = history?.sampling.find((row) => row.id === params.edit) ?? null;
  const selectedCycleId = editLog?.cycleId ?? (cycles.some((cycle) => cycle.id === params.cycleId) ? params.cycleId : "");

  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / BIOLOGI</p><h1>Sampling</h1><p>Catat observed measurement dan koreksi raw log selama siklus masih aktif.</p></div><div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus aktif</span></div></div>
        <BudidayaWorkspaceNav active="sampling" />
        {params.saved === "1" ? <div className="notice successNotice">Sampling berhasil disimpan.</div> : null}
        {params.updated === "1" ? <div className="notice successNotice">Sampling berhasil dikoreksi dan alert dihitung ulang.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={editLog ? correctSampling : submitSampling} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>{editLog ? "CORRECTION" : "NEW OBSERVATION"}</span><h2>{editLog ? `Edit sampling ${editLog.cycle.pond.code}` : "Catat hasil sampling"}</h2></div>{editLog ? <Link href="/sampling">Batal</Link> : <small>Observed data</small>}</div>
            {editLog ? <input type="hidden" name="id" value={editLog.id} /> : null}
            <div className="formSectionBlock"><h3>Siklus & waktu</h3><div className="compactFieldGrid two">
              <label><span>Kolam / Siklus</span><select name="cycleId" required disabled={Boolean(editLog) || cycles.length === 0} defaultValue={selectedCycleId}><option value="">Pilih kolam</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label>
              <label><span>Tanggal sampling</span><input name={editLog ? "sampledAt" : "sampledDate"} type="date" defaultValue={editLog ? dateInput.format(editLog.sampledAt) : dateInput.format(new Date())} required /></label>
            </div></div>
            <div className="formSectionBlock"><h3>Hasil sampel</h3><div className="compactFieldGrid two">
              <label><span>Jumlah ikan sampel</span><div className="compactUnitInput"><input name="sampleCount" type="number" min="1" step="1" defaultValue={editLog?.sampleCount ?? ""} placeholder="30" required /><b>ekor</b></div></label>
              <label><span>Total berat sampel</span><div className="compactUnitInput"><input name="totalSampleWeightKg" type="number" min="0.001" step="0.001" defaultValue={decimal(editLog?.totalSampleWeightKg)} placeholder="8.1" /><b>kg</b></div></label>
              <label><span>Bobot rata-rata</span><div className="compactUnitInput"><input name="averageWeightG" type="number" min="0.001" step="0.001" defaultValue={decimal(editLog?.averageWeightG)} placeholder="270" /><b>g</b></div></label>
              <label><span>Panjang rata-rata</span><div className="compactUnitInput"><input name="averageLengthCm" type="number" min="0.001" step="0.001" defaultValue={decimal(editLog?.averageLengthCm)} placeholder="18.5" /><b>cm</b></div></label>
            </div><label><span>Populasi teramati</span><div className="compactUnitInput"><input name="observedPopulation" type="number" min="1" step="1" defaultValue={editLog?.observedPopulation ?? ""} /><b>ekor</b></div></label></div>
            <div className="formSectionBlock"><h3>Catatan lapangan</h3><label><span>Catatan sampling</span><textarea name="notes" rows={3} defaultValue={editLog?.notes ?? ""} /></label></div>
            <div className="workspaceInlineNotice neutral"><strong>{editLog ? "Correction rule:" : "Validasi sampling:"}</strong><span>{editLog ? "Koreksi hanya diizinkan pada siklus aktif/harvesting." : "Isi minimal total berat sampel atau bobot rata-rata; konsistensi dicek server."}</span></div>
            <div className="workspaceFormActions"><span>ABW adalah observed; biomassa/FCR tetap derived.</span><button className="workspacePrimaryButton" type="submit" disabled={!editLog && cycles.length === 0}>{editLog ? "Simpan Koreksi" : "Simpan Sampling"}</button></div>
          </form>

          <aside className="operationContextStack"><section className="workspaceCard operationContextCard"><div className="workspaceCardHeader"><div><span>DATA EFFECT</span><h2>KPI yang berubah</h2></div></div><div className="contextMetricList"><div><span>ABW</span><strong>Observed</strong></div><div><span>Biomassa</span><strong>Estimated</strong></div><div><span>FCR</span><strong>Recalculated</strong></div><div><span>Growth trend</span><strong>Updated</strong></div></div></section></aside>
        </div>

        <section className="workspaceCard historyLedgerCard"><div className="sectionHeaderInline"><div><p className="eyebrow dark">OBSERVED HISTORY</p><h2>Riwayat Sampling</h2></div><span className="mutedInline">{history?.sampling.length ?? 0} log</span></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Tanggal</th><th>Siklus</th><th>Sampel</th><th>ABW</th><th>Panjang</th><th>Populasi Teramati</th><th>Status</th><th></th></tr></thead><tbody>
          {(history?.sampling.slice(0, 20) ?? []).map((row) => { const canEdit = row.cycle.status === "ACTIVE" || row.cycle.status === "HARVESTING"; return <tr key={row.id}><td>{dateLabel.format(row.sampledAt)}</td><td><strong>{row.cycle.pond.code}</strong><br /><small>{row.cycle.cycleCode}</small></td><td>{row.sampleCount} ekor</td><td>{row.averageWeightG ? `${Number(row.averageWeightG).toLocaleString("id-ID")} g` : "—"}</td><td>{row.averageLengthCm ? `${Number(row.averageLengthCm).toLocaleString("id-ID")} cm` : "—"}</td><td>{row.observedPopulation ? `${row.observedPopulation.toLocaleString("id-ID")} ekor` : "—"}</td><td><span className={`statusBadge ${canEdit ? "warning" : "good"}`}>{canEdit ? "EDITABLE" : "LOCKED"}</span></td><td>{canEdit ? <Link className="tableAction" href={`/sampling?edit=${row.id}`}>Edit</Link> : "—"}</td></tr>; })}
          {(history?.sampling.length ?? 0) === 0 ? <tr><td colSpan={8}>Belum ada sampling.</td></tr> : null}
        </tbody></table></div></section>
      </div>
    </AppFrame>
  );
}
