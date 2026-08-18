import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getOperationalLogHistory } from "@/src/application/operations/manage-operational-logs";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { correctFeed, correctMortality } from "@/app/_actions/operational-corrections";
import { submitDailyInput } from "./actions";

export const dynamic = "force-dynamic";
const dateInput = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function InputPage({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string; error?: string; cycleId?: string; editFeed?: string; editMortality?: string }> }) {
  const params = await searchParams;
  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getOperationalLogHistory>> = null;
  let databaseError = false;
  try { [cycles, shell, history] = await Promise.all([getActiveCycleOptions(), getAppShellContext(), getOperationalLogHistory()]); } catch { databaseError = true; }
  const selectedCycleId = cycles.some((cycle) => cycle.id === params.cycleId) ? params.cycleId : "";
  const editFeed = history?.feeding.find((row) => row.id === params.editFeed) ?? null;
  const editMortality = history?.mortality.find((row) => row.id === params.editMortality) ?? null;

  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / DAILY LOG</p><h1>Input Harian</h1><p>Catat pakan, mortalitas, biaya tambahan, dan koreksi raw log selama siklus masih aktif.</p></div><div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus aktif</span></div></div>
        <BudidayaWorkspaceNav active="input" />
        {params.saved === "1" ? <div className="notice successNotice">Data harian berhasil disimpan.</div> : null}
        {params.updated === "1" ? <div className="notice successNotice">Raw log berhasil dikoreksi dan alert dihitung ulang.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitDailyInput} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>DAILY EVENT</span><h2>Catat kondisi hari ini</h2></div><small>Raw operational data</small></div>
            <div className="formSectionBlock"><h3>Siklus & waktu</h3><div className="compactFieldGrid two"><label><span>Kolam / Siklus</span><select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}><option value="">Pilih kolam</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label><label><span>Tanggal</span><input name="eventDate" type="date" defaultValue={dateInput.format(new Date())} required /></label></div></div>
            <div className="formSectionBlock"><h3>Operasional harian</h3><div className="compactFieldGrid two"><label><span>Pakan diberikan</span><div className="compactUnitInput"><input name="feedKg" type="number" min="0" step="0.001" placeholder="0" /><b>kg</b></div></label><label><span>Ikan mati</span><div className="compactUnitInput"><input name="mortalityQty" type="number" min="0" step="1" placeholder="0" /><b>ekor</b></div></label></div></div>
            <div className="formSectionBlock"><h3>Biaya tambahan</h3><div className="compactFieldGrid two"><label><span>Kategori</span><select name="additionalExpenseCategory" defaultValue="OTHER"><option value="PROBIOTIC">Probiotik</option><option value="MEDICINE">Obat</option><option value="ELECTRICITY">Listrik</option><option value="WATER">Air</option><option value="LABOR">Tenaga Kerja</option><option value="MAINTENANCE">Maintenance</option><option value="TRANSPORT">Transport</option><option value="OTHER">Lainnya</option></select></label><label><span>Nominal</span><div className="compactUnitInput money"><b>Rp</b><input name="additionalExpenseAmount" type="number" min="0" step="1" placeholder="0" /></div></label></div></div>
            <div className="formSectionBlock"><h3>Catatan lapangan</h3><label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ikan aktif, nafsu makan normal, air sedikit keruh, dll." /></label></div>
            <div className="workspaceFormActions"><span>Isi minimal satu: pakan, mortalitas, atau biaya tambahan.</span><button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Data Harian</button></div>
          </form>
          <aside className="operationContextStack"><section className="workspaceCard operationContextCard"><div className="workspaceCardHeader"><div><span>DATA EFFECT</span><h2>Yang berubah</h2></div></div><div className="contextMetricList"><div><span>Pakan</span><strong>Cumulative feed</strong></div><div><span>Mortalitas</span><strong>SR & population</strong></div><div><span>Biaya</span><strong>Running cost</strong></div><div><span>Alert</span><strong>Rules re-evaluated</strong></div></div></section></aside>
        </div>

        {editFeed ? <form action={correctFeed} className="workspaceCard correctionCard"><div className="workspaceCardHeader"><div><span>CORRECTION</span><h2>Edit log pakan · {editFeed.cycle.pond.code}</h2></div><Link href="/input">Batal</Link></div><input type="hidden" name="id" value={editFeed.id} /><div className="compactFieldGrid three"><label><span>Tanggal</span><input name="eventAt" type="date" required defaultValue={dateInput.format(editFeed.eventAt)} /></label><label><span>Pakan</span><div className="compactUnitInput"><input name="quantityKg" type="number" min="0.001" step="0.001" required defaultValue={Number(editFeed.quantityKg)} /><b>kg</b></div></label><label><span>Catatan</span><input name="notes" defaultValue={editFeed.notes ?? ""} /></label></div><div className="workspaceFormActions"><span>Biaya pakan linked akan dihitung ulang dari unit cost yang tersimpan.</span><button className="workspacePrimaryButton" type="submit">Simpan Koreksi</button></div></form> : null}
        {editMortality ? <form action={correctMortality} className="workspaceCard correctionCard"><div className="workspaceCardHeader"><div><span>CORRECTION</span><h2>Edit mortalitas · {editMortality.cycle.pond.code}</h2></div><Link href="/input">Batal</Link></div><input type="hidden" name="id" value={editMortality.id} /><div className="compactFieldGrid three"><label><span>Tanggal</span><input name="eventAt" type="date" required defaultValue={dateInput.format(editMortality.eventAt)} /></label><label><span>Ikan mati</span><div className="compactUnitInput"><input name="quantity" type="number" min="1" step="1" required defaultValue={editMortality.quantity} /><b>ekor</b></div></label><label><span>Catatan</span><input name="notes" defaultValue={editMortality.notes ?? ""} /></label></div><div className="workspaceFormActions"><span>Server memvalidasi mortalitas terhadap populasi yang tersedia.</span><button className="workspacePrimaryButton" type="submit">Simpan Koreksi</button></div></form> : null}

        <div className="historyTwoColumn">
          <section className="workspaceCard historyLedgerCard"><div className="sectionHeaderInline"><div><p className="eyebrow dark">FEED LOG</p><h2>Riwayat Pakan</h2></div></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Tanggal</th><th>Siklus</th><th>Qty</th><th>Status</th><th></th></tr></thead><tbody>{(history?.feeding.slice(0, 15) ?? []).map((row) => { const canEdit = row.cycle.status === "ACTIVE" || row.cycle.status === "HARVESTING"; return <tr key={row.id}><td>{dateLabel.format(row.eventAt)}</td><td>{row.cycle.pond.code}</td><td>{Number(row.quantityKg).toLocaleString("id-ID")} kg</td><td><span className={`statusBadge ${canEdit ? "warning" : "good"}`}>{canEdit ? "EDITABLE" : "LOCKED"}</span></td><td>{canEdit ? <Link className="tableAction" href={`/input?editFeed=${row.id}`}>Edit</Link> : "—"}</td></tr>; })}</tbody></table></div></section>
          <section className="workspaceCard historyLedgerCard"><div className="sectionHeaderInline"><div><p className="eyebrow dark">MORTALITY LOG</p><h2>Riwayat Mortalitas</h2></div></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Tanggal</th><th>Siklus</th><th>Qty</th><th>Status</th><th></th></tr></thead><tbody>{(history?.mortality.slice(0, 15) ?? []).map((row) => { const canEdit = row.cycle.status === "ACTIVE" || row.cycle.status === "HARVESTING"; return <tr key={row.id}><td>{dateLabel.format(row.eventAt)}</td><td>{row.cycle.pond.code}</td><td>{row.quantity.toLocaleString("id-ID")} ekor</td><td><span className={`statusBadge ${canEdit ? "warning" : "good"}`}>{canEdit ? "EDITABLE" : "LOCKED"}</span></td><td>{canEdit ? <Link className="tableAction" href={`/input?editMortality=${row.id}`}>Edit</Link> : "—"}</td></tr>; })}</tbody></table></div></section>
        </div>
      </div>
    </AppFrame>
  );
}
