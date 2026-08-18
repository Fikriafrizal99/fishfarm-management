import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getOperationalLogHistory } from "@/src/application/operations/manage-operational-logs";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { ExportMenu } from "@/app/_components/export-menu";
import { correctExpense } from "@/app/_actions/operational-corrections";
import { submitExpense } from "./actions";

export const dynamic = "force-dynamic";
const dateInput = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const categories = ["PROBIOTIC", "MEDICINE", "ELECTRICITY", "WATER", "LABOR", "MAINTENANCE", "TRANSPORT", "OTHER"] as const;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ saved?: string; updated?: string; error?: string; cycleId?: string; edit?: string }> }) {
  const params = await searchParams;
  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getOperationalLogHistory>> = null;
  let databaseError = false;
  try { [cycles, shell, history] = await Promise.all([getActiveCycleOptions(), getAppShellContext(), getOperationalLogHistory()]); } catch { databaseError = true; }
  const editExpense = history?.expenses.find((row) => row.id === params.edit) ?? null;
  const selectedCycleId = editExpense?.cycleId ?? (cycles.some((cycle) => cycle.id === params.cycleId) ? params.cycleId : "");

  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / COST LEDGER</p><h1>Biaya</h1><p>Catat dan koreksi biaya manual yang membentuk running cost dan HPP siklus.</p></div><div className="workspaceHeadingActions"><ExportMenu items={[{ label: "Expense Ledger CSV", href: "/api/export/data/expenses" }]} /></div></div>
        <BudidayaWorkspaceNav active="expenses" />
        {params.saved === "1" ? <div className="notice successNotice">Biaya berhasil disimpan.</div> : null}
        {params.updated === "1" ? <div className="notice successNotice">Biaya berhasil dikoreksi.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={editExpense ? correctExpense : submitExpense} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>{editExpense ? "CORRECTION" : "NEW EXPENSE"}</span><h2>{editExpense ? `Edit biaya · ${editExpense.cycle?.pond.code ?? "Farm"}` : "Catat biaya operasional"}</h2></div>{editExpense ? <Link href="/expenses">Batal</Link> : <small>Raw production cost</small>}</div>
            {editExpense ? <input type="hidden" name="id" value={editExpense.id} /> : null}
            <div className="formSectionBlock"><h3>Siklus & waktu</h3><div className="compactFieldGrid two"><label><span>Kolam / Siklus</span><select name="cycleId" required disabled={Boolean(editExpense) || cycles.length === 0} defaultValue={selectedCycleId}><option value="">Pilih kolam</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label><label><span>Tanggal biaya</span><input name={editExpense ? "expenseDate" : "eventDate"} type="date" defaultValue={editExpense ? dateInput.format(editExpense.expenseDate) : dateInput.format(new Date())} required /></label></div></div>
            <div className="formSectionBlock"><h3>Komponen biaya</h3><div className="compactFieldGrid two"><label><span>Kategori</span><select name="category" defaultValue={editExpense?.category ?? "OTHER"}>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label><label><span>Nominal biaya</span><div className="compactUnitInput money"><b>Rp</b><input name="amount" type="number" min="1" step="1" defaultValue={editExpense ? Number(editExpense.amount) : ""} placeholder="0" required /></div></label></div></div>
            {editExpense ? <div className="formSectionBlock"><h3>Keterangan ledger</h3><label><span>Deskripsi</span><input name="description" required defaultValue={editExpense.description} /></label><label><span>Catatan</span><textarea name="notes" rows={3} defaultValue={editExpense.notes ?? ""} /></label></div> : <div className="formSectionBlock"><h3>Keterangan</h3><label><span>Catatan biaya</span><textarea name="notes" rows={3} placeholder="Pembelian probiotik, listrik pompa, transport, perbaikan aerasi, dll." /></label></div>}
            <div className="workspaceFormActions"><span>{editExpense ? "Koreksi hanya untuk source MANUAL pada siklus aktif." : "Expense menambah running cost siklus."}</span><button className="workspacePrimaryButton" type="submit" disabled={!editExpense && cycles.length === 0}>{editExpense ? "Simpan Koreksi" : "Simpan Biaya"}</button></div>
          </form>
          <aside className="operationContextStack"><section className="workspaceCard operationContextCard"><div className="workspaceCardHeader"><div><span>COST EFFECT</span><h2>Dampak pencatatan</h2></div></div><div className="contextMetricList"><div><span>Running cost</span><strong>Raw ledger</strong></div><div><span>Biaya/kg biomassa</span><strong>Recalculated</strong></div><div><span>HPP final</span><strong>All-in cost</strong></div><div><span>Profit final</span><strong>Actual setelah selesai</strong></div></div></section></aside>
        </div>

        <section className="workspaceCard historyLedgerCard"><div className="sectionHeaderInline"><div><p className="eyebrow dark">MANUAL COST HISTORY</p><h2>Ledger Biaya Manual</h2></div><span className="mutedInline">{history?.expenses.length ?? 0} log</span></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Tanggal</th><th>Siklus</th><th>Kategori</th><th>Deskripsi</th><th>Nominal</th><th>Status</th><th></th></tr></thead><tbody>
          {(history?.expenses.slice(0, 30) ?? []).map((row) => { const canEdit = !row.cycle || row.cycle.status === "ACTIVE" || row.cycle.status === "HARVESTING"; return <tr key={row.id}><td>{dateLabel.format(row.expenseDate)}</td><td>{row.cycle ? <><strong>{row.cycle.pond.code}</strong><br /><small>{row.cycle.cycleCode}</small></> : "Farm"}</td><td>{row.category}</td><td>{row.description}</td><td className="strongCell">{currency.format(Number(row.amount))}</td><td><span className={`statusBadge ${canEdit ? "warning" : "good"}`}>{canEdit ? "EDITABLE" : "LOCKED"}</span></td><td>{canEdit ? <Link className="tableAction" href={`/expenses?edit=${row.id}`}>Edit</Link> : "—"}</td></tr>; })}
          {(history?.expenses.length ?? 0) === 0 ? <tr><td colSpan={7}>Belum ada biaya manual.</td></tr> : null}
        </tbody></table></div></section>
      </div>
    </AppFrame>
  );
}
