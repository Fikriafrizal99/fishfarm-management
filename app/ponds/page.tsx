import Link from "next/link";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getProductionManagementData } from "@/src/application/management/manage-production";
import { savePond } from "./actions";

export const dynamic = "force-dynamic";

function decimal(value: unknown): string { return value === null || value === undefined ? "" : String(Number(value)); }

export default async function PondsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const params = await searchParams;
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let data: Awaited<ReturnType<typeof getProductionManagementData>> = null;
  try { [shell, data] = await Promise.all([getAppShellContext(), getProductionManagementData()]); } catch { data = null; }

  const editPond = data?.ponds.find((pond) => pond.id === params.edit) ?? null;
  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / MASTER DATA</p><h1>Kolam</h1><p>Kelola aset kolam fisik tanpa mencampurnya dengan siklus produksi.</p></div><div className="workspaceHeadingStats"><span><b>{data?.ponds.length ?? 0}</b> kolam</span></div></div>
        <BudidayaWorkspaceNav active="ponds" />
        {params.saved === "1" ? <div className="notice successNotice">Data kolam berhasil disimpan.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}

        <div className="workspaceSplit managementSplit">
          <form action={savePond} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>{editPond ? "EDIT POND" : "NEW POND"}</span><h2>{editPond ? `Edit ${editPond.code}` : "Tambah kolam"}</h2></div>{editPond ? <Link href="/ponds">Batal</Link> : null}</div>
            <input type="hidden" name="pondId" value={editPond?.id ?? ""} />
            <div className="formSectionBlock"><h3>Identitas</h3><div className="compactFieldGrid two">
              <label><span>Kode Kolam</span><input name="code" defaultValue={editPond?.code ?? ""} placeholder="KLM-003" required={!editPond} disabled={Boolean(editPond)} /></label>
              <label><span>Nama Kolam</span><input name="name" defaultValue={editPond?.name ?? ""} placeholder="Kolam Nila 3" /></label>
              <label><span>Jenis Kolam</span><input name="pondType" defaultValue={editPond?.pondType ?? ""} placeholder="Terpal / Beton / Tanah" /></label>
              {editPond ? <label><span>Status</span><select name="status" defaultValue={editPond.status}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="MAINTENANCE">MAINTENANCE</option></select></label> : null}
            </div></div>
            <div className="formSectionBlock"><h3>Dimensi</h3><div className="compactFieldGrid three">
              <label><span>Panjang</span><div className="compactUnitInput"><input name="lengthM" type="number" min="0.01" step="0.01" defaultValue={decimal(editPond?.lengthM)} /><b>m</b></div></label>
              <label><span>Lebar</span><div className="compactUnitInput"><input name="widthM" type="number" min="0.01" step="0.01" defaultValue={decimal(editPond?.widthM)} /><b>m</b></div></label>
              <label><span>Kedalaman</span><div className="compactUnitInput"><input name="depthM" type="number" min="0.01" step="0.01" defaultValue={decimal(editPond?.depthM)} /><b>m</b></div></label>
            </div></div>
            <div className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan kolam</span><textarea name="notes" rows={3} defaultValue={editPond?.notes ?? ""} placeholder="Kondisi konstruksi, aerasi, penggunaan khusus, dll." /></label></div>
            <div className="workspaceFormActions"><span>Kolam adalah aset fisik. Siklus dibuat terpisah.</span><button className="workspacePrimaryButton" type="submit">{editPond ? "Simpan Perubahan" : "Tambah Kolam"}</button></div>
          </form>

          <section className="workspaceCard managementListCard">
            <div className="workspaceCardHeader"><div><span>POND REGISTER</span><h2>Daftar kolam</h2></div></div>
            <div className="recordTableWrap"><table className="recordTable"><thead><tr><th>Kolam</th><th>Jenis</th><th>Dimensi</th><th>Status</th><th>Siklus terakhir</th><th></th></tr></thead><tbody>
              {(data?.ponds ?? []).map((pond) => { const last = pond.cycles[0]; return <tr key={pond.id}><td><strong>{pond.code}</strong><small>{pond.name ?? "—"}</small></td><td>{pond.pondType ?? "—"}</td><td>{pond.lengthM && pond.widthM && pond.depthM ? `${Number(pond.lengthM)} × ${Number(pond.widthM)} × ${Number(pond.depthM)} m` : "—"}</td><td><span className={`statusBadge ${pond.status === "ACTIVE" ? "good" : "warning"}`}>{pond.status}</span></td><td>{last ? <><strong>{last.cycleCode}</strong><small>{last.status}</small></> : "Belum ada"}</td><td><Link className="tableAction" href={`/ponds?edit=${pond.id}`}>Edit</Link></td></tr>; })}
              {(data?.ponds.length ?? 0) === 0 ? <tr><td colSpan={6}>Belum ada kolam.</td></tr> : null}
            </tbody></table></div>
          </section>
        </div>
      </div>
    </AppFrame>
  );
}
