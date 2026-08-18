import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { getOperationalLogHistory } from "@/src/application/operations/manage-operational-logs";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitHarvest } from "./actions";

export const dynamic = "force-dynamic";
const dateInput = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default async function HarvestPage({ searchParams }: { searchParams: Promise<{ error?: string; cycleId?: string }> }) {
  const params = await searchParams;
  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let shell: Awaited<ReturnType<typeof getAppShellContext>> = null;
  let history: Awaited<ReturnType<typeof getOperationalLogHistory>> = null;
  let databaseError = false;
  try { [cycles, shell, history] = await Promise.all([getActiveCycleOptions(), getAppShellContext(), getOperationalLogHistory()]); } catch { databaseError = true; }
  const selectedCycleId = cycles.some((cycle) => cycle.id === params.cycleId) ? params.cycleId : "";

  return (
    <AppFrame active="budidaya" ownerName={shell?.ownerName ?? null} alertCount={shell?.openAlertCount ?? 0} activePonds={shell?.activePonds}>
      <div className="opsPage operationWorkspacePage">
        <div className="workspaceHeadingRow"><div><p className="workspaceKicker">BUDIDAYA / HARVEST</p><h1>Panen</h1><p>Catat realisasi panen dan bentuk HarvestLot untuk fulfillment komersial.</p></div><div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus dapat dipanen</span></div></div>
        <BudidayaWorkspaceNav active="harvest" />
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitHarvest} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>HARVEST EVENT</span><h2>Catat realisasi panen</h2></div><small>Produksi → HarvestLot</small></div>
            <div className="formSectionBlock"><h3>Siklus & waktu</h3><div className="compactFieldGrid two"><label><span>Kolam / Siklus</span><select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}><option value="">Pilih kolam</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label><label><span>Tanggal panen</span><input name="harvestedDate" type="date" defaultValue={dateInput.format(new Date())} required /></label></div><label><span>Jenis panen</span><select name="harvestType" defaultValue="PARTIAL" required><option value="PARTIAL">Panen Parsial</option><option value="FINAL">Panen Final / Tutup Siklus</option></select></label></div>
            <div className="formSectionBlock"><h3>Hasil panen</h3><div className="compactFieldGrid two"><label><span>Berat panen</span><div className="compactUnitInput"><input name="weightKg" type="number" min="0.001" step="0.001" placeholder="810" required /><b>kg</b></div></label><label><span>Jumlah ikan</span><div className="compactUnitInput"><input name="fishCount" type="number" min="1" step="1" /><b>ekor</b></div></label><label><span>Harga realisasi/kg <em className="fieldTag">snapshot</em></span><div className="compactUnitInput money"><b>Rp</b><input name="sellingPricePerKg" type="number" min="1" step="1" placeholder="23000" required /></div></label><label><span>Biaya panen</span><div className="compactUnitInput money"><b>Rp</b><input name="harvestCost" type="number" min="0" step="1" placeholder="0" /></div></label></div></div>
            <div className="formSectionBlock"><h3>Catatan komersial transisi</h3><label><span>Pembeli langsung <em className="fieldTag">opsional</em></span><input name="buyerName" placeholder="Kosongkan jika dikelola lewat Sales CRM" /></label><label><span>Catatan panen</span><textarea name="notes" rows={3} /></label></div>
            <div className="workspaceFormActions"><span>Setiap panen otomatis membuat HarvestLot.</span><button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Panen</button></div>
          </form>
          <aside className="operationContextStack"><section className="workspaceCard operationContextCard"><div className="workspaceCardHeader"><div><span>INTEGRITY POLICY</span><h2>Setelah tersimpan</h2></div></div><div className="contextMetricList"><div><span>Harvest</span><strong>Terkunci setelah simpan</strong></div><div><span>HarvestLot</span><strong>Dibuat otomatis</strong></div><div><span>Fulfillment</span><strong>Alokasi komersial</strong></div><div><span>Koreksi</span><strong>Tidak diedit langsung</strong></div></div><p className="metricDisclaimer">Panen tidak diedit langsung karena dapat sudah terhubung ke HarvestLot dan transaksi Sales CRM.</p></section></aside>
        </div>

        <section className="workspaceCard historyLedgerCard"><div className="sectionHeaderInline"><div><p className="eyebrow dark">HARVEST HISTORY</p><h2>Riwayat Panen</h2></div><span className="mutedInline">{history?.harvests.length ?? 0} event</span></div><div className="dataTableWrap"><table className="dataTable"><thead><tr><th>Tanggal</th><th>Siklus</th><th>Jenis</th><th>Berat</th><th>Harga/kg</th><th>Revenue Snapshot</th><th>HarvestLot</th><th>Status</th></tr></thead><tbody>
          {(history?.harvests ?? []).map((row) => <tr key={row.id}><td>{dateLabel.format(row.harvestedAt)}</td><td><strong>{row.cycle.pond.code}</strong><br /><small>{row.cycle.cycleCode}</small></td><td>{row.harvestType}</td><td>{Number(row.weightKg).toLocaleString("id-ID")} kg</td><td>{currency.format(Number(row.sellingPricePerKg))}</td><td>{currency.format(Number(row.revenueAmount))}</td><td>{row.harvestLot?.lotCode ?? "—"}</td><td><span className="statusBadge good">LOCKED</span></td></tr>)}
          {(history?.harvests.length ?? 0) === 0 ? <tr><td colSpan={8}>Belum ada panen.</td></tr> : null}
        </tbody></table></div></section>
      </div>
    </AppFrame>
  );
}
