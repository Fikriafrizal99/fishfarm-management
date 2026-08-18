import Link from "next/link";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getProductionManagementData } from "@/src/application/management/manage-production";
import { saveCycle } from "./actions";

export const dynamic = "force-dynamic";

const dateInput = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function decimal(value: unknown): string { return value === null || value === undefined ? "" : String(Number(value)); }

export default async function CyclesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const params = await searchParams;
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let data: Awaited<ReturnType<typeof getProductionManagementData>> = null;
  try { [shell, data] = await Promise.all([getAppShellContext(), getProductionManagementData()]); } catch { data = null; }

  const editCycle = data?.cycles.find((cycle) => cycle.id === params.edit) ?? null;
  const firstStocking = editCycle?.stockings[0] ?? null;
  const activePondIds = new Set((data?.cycles ?? []).filter((cycle) => cycle.status === "ACTIVE" || cycle.status === "HARVESTING").map((cycle) => cycle.pondId));
  const availablePonds = (data?.ponds ?? []).filter((pond) => pond.status === "ACTIVE" && !activePondIds.has(pond.id));
  const editable = editCycle && editCycle.status !== "COMPLETED" && editCycle.status !== "CANCELLED";

  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / PRODUCTION CYCLE</p><h1>Siklus</h1><p>Mulai siklus baru dan kelola target produksi tanpa mengubah histori siklus selesai.</p></div><div className="workspaceHeadingStats"><span><b>{data?.cycles.length ?? 0}</b> total siklus</span></div></div>
        <BudidayaWorkspaceNav active="cycles" />
        {params.saved === "1" ? <div className="notice successNotice">Siklus berhasil disimpan.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}

        <div className="workspaceSplit managementSplit">
          <form action={saveCycle} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>{editCycle ? "EDIT CYCLE" : "NEW CYCLE"}</span><h2>{editCycle ? editCycle.cycleCode : "Mulai siklus"}</h2></div>{editCycle ? <Link href="/cycles">Batal</Link> : null}</div>
            <input type="hidden" name="cycleId" value={editCycle?.id ?? ""} />
            {!editCycle ? <div className="formSectionBlock"><h3>Kolam & species</h3><div className="compactFieldGrid two">
              <label><span>Kolam</span><select name="pondId" required defaultValue=""><option value="">Pilih kolam kosong</option>{availablePonds.map((pond) => <option value={pond.id} key={pond.id}>{pond.code} · {pond.name ?? "Tanpa nama"}</option>)}</select></label>
              <label><span>Species</span><select name="speciesId" required defaultValue=""><option value="">Pilih species</option>{(data?.species ?? []).map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}</select></label>
              <label><span>Kode Siklus</span><input name="cycleCode" required placeholder="KLM-003-2026-01" /></label>
              <label><span>Tanggal Tebar</span><input name="startedAt" type="date" required defaultValue={dateInput.format(new Date())} /></label>
            </div></div> : <div className="formSectionBlock"><h3>Identitas</h3><div className="contextMetricList"><div><span>Kolam</span><strong>{editCycle.pond.code}</strong></div><div><span>Species</span><strong>{editCycle.species.commonName}</strong></div><div><span>Status</span><strong>{editCycle.status}</strong></div><div><span>Mulai</span><strong>{editCycle.startedAt ? dateLabel.format(editCycle.startedAt) : "—"}</strong></div></div></div>}

            <div className="formSectionBlock"><h3>Tebar awal</h3><div className="compactFieldGrid two">
              <label><span>Jumlah Benih</span><div className="compactUnitInput"><input name="stockingQuantity" type="number" min="1" step="1" required defaultValue={firstStocking?.quantity ?? ""} placeholder="3000" disabled={Boolean(editCycle && !editable)} /><b>ekor</b></div></label>
              <label><span>Bobot Awal</span><div className="compactUnitInput"><input name="stockingAvgWeightG" type="number" min="0.001" step="0.001" defaultValue={decimal(firstStocking?.avgWeightG)} placeholder="10" disabled={Boolean(editCycle && !editable)} /><b>g</b></div></label>
              <label><span>Biaya Benih / ekor</span><div className="compactUnitInput money"><b>Rp</b><input name="seedCostPerUnit" type="number" min="0" step="1" defaultValue={decimal(firstStocking?.seedCostPerUnit)} placeholder="750" disabled={Boolean(editCycle && !editable)} /></div></label>
              <label><span>Supplier</span><input name="supplier" defaultValue={firstStocking?.supplier ?? ""} placeholder="Nama hatchery / supplier" disabled={Boolean(editCycle && !editable)} /></label>
            </div></div>

            <div className="formSectionBlock"><h3>Target siklus</h3><div className="compactFieldGrid two">
              <label><span>Target Tanggal Panen</span><input name="targetHarvestDate" type="date" defaultValue={editCycle?.targetHarvestDate ? dateInput.format(editCycle.targetHarvestDate) : ""} disabled={Boolean(editCycle && !editable)} /></label>
              <label><span>Target Panen</span><div className="compactUnitInput"><input name="targetHarvestWeightKg" type="number" min="0.001" step="0.001" defaultValue={decimal(editCycle?.targetHarvestWeightKg)} placeholder="750" disabled={Boolean(editCycle && !editable)} /><b>kg</b></div></label>
              <label><span>Target SR</span><div className="compactUnitInput"><input name="targetSrPct" type="number" min="0.01" step="0.01" defaultValue={decimal(editCycle?.targetSrPct)} placeholder="90" disabled={Boolean(editCycle && !editable)} /><b>%</b></div></label>
              <label><span>Target FCR</span><input name="targetFcr" type="number" min="0.01" step="0.01" defaultValue={decimal(editCycle?.targetFcr)} placeholder="1.20" disabled={Boolean(editCycle && !editable)} /></label>
              <label><span>Target HPP / kg</span><div className="compactUnitInput money"><b>Rp</b><input name="targetHppPerKg" type="number" min="0.01" step="1" defaultValue={decimal(editCycle?.targetHppPerKg)} placeholder="16000" disabled={Boolean(editCycle && !editable)} /></div></label>
              <label><span>Target Harga Jual / kg</span><div className="compactUnitInput money"><b>Rp</b><input name="targetSellingPricePerKg" type="number" min="0.01" step="1" defaultValue={decimal(editCycle?.targetSellingPricePerKg)} placeholder="23000" disabled={Boolean(editCycle && !editable)} /></div></label>
            </div></div>
            <div className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan siklus</span><textarea name="notes" rows={3} defaultValue={editCycle?.notes ?? ""} disabled={Boolean(editCycle && !editable)} /></label></div>
            <div className="workspaceFormActions"><span>{editCycle && !editable ? "Siklus selesai bersifat read-only." : "Perubahan target tidak mengubah raw log historis."}</span>{!editCycle || editable ? <button className="workspacePrimaryButton" type="submit">{editCycle ? "Simpan Perubahan" : "Mulai Siklus"}</button> : null}</div>
          </form>

          <section className="workspaceCard managementListCard"><div className="workspaceCardHeader"><div><span>CYCLE REGISTER</span><h2>Daftar siklus</h2></div></div><div className="recordTableWrap"><table className="recordTable"><thead><tr><th>Siklus</th><th>Kolam</th><th>Species</th><th>Mulai</th><th>Target Panen</th><th>Status</th><th></th></tr></thead><tbody>
            {(data?.cycles ?? []).map((cycle) => <tr key={cycle.id}><td><strong>{cycle.cycleCode}</strong></td><td>{cycle.pond.code}</td><td>{cycle.species.commonName}</td><td>{cycle.startedAt ? dateLabel.format(cycle.startedAt) : "—"}</td><td>{cycle.targetHarvestDate ? dateLabel.format(cycle.targetHarvestDate) : "—"}</td><td><span className={`statusBadge ${cycle.status === "COMPLETED" ? "good" : cycle.status === "CANCELLED" ? "danger" : "warning"}`}>{cycle.status}</span></td><td><Link className="tableAction" href={`/cycles?edit=${cycle.id}`}>{cycle.status === "COMPLETED" || cycle.status === "CANCELLED" ? "Lihat" : "Edit"}</Link></td></tr>)}
            {(data?.cycles.length ?? 0) === 0 ? <tr><td colSpan={7}>Belum ada siklus.</td></tr> : null}
          </tbody></table></div></section>
        </div>
      </div>
    </AppFrame>
  );
}
