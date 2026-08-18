import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { BudidayaWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitHarvest } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function HarvestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cycleId?: string }>;
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
            <p className="workspaceKicker">BUDIDAYA / HARVEST</p>
            <h1>Panen</h1>
            <p>Catat realisasi panen dan hasilkan HarvestLot untuk proses fulfillment Sales CRM.</p>
          </div>
          <div className="workspaceHeadingStats"><span><b>{cycles.length}</b> siklus dapat dipanen</span></div>
        </div>

        <BudidayaWorkspaceNav active="harvest" />

        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung. Form akan aktif setelah development database dijalankan.</div> : null}

        <div className="workspaceSplit operationSplit">
          <form action={submitHarvest} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader">
              <div><span>HARVEST EVENT</span><h2>Catat realisasi panen</h2></div>
              <small>Produksi → HarvestLot</small>
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
                <label><span>Tanggal panen</span><input name="harvestedDate" type="date" defaultValue={todayInJakarta()} required /></label>
              </div>
              <label>
                <span>Jenis panen</span>
                <select name="harvestType" defaultValue="PARTIAL" required>
                  <option value="PARTIAL">Panen Parsial</option>
                  <option value="FINAL">Panen Final / Tutup Siklus</option>
                </select>
              </label>
            </div>

            <div className="formSectionBlock">
              <h3>Hasil panen</h3>
              <div className="compactFieldGrid two">
                <label><span>Berat panen</span><div className="compactUnitInput"><input name="weightKg" type="number" min="0.001" step="0.001" placeholder="810" required /><b>kg</b></div></label>
                <label><span>Jumlah ikan (opsional)</span><div className="compactUnitInput"><input name="fishCount" type="number" min="1" step="1" placeholder="Isi jika dihitung" /><b>ekor</b></div></label>
                <label><span>Harga realisasi/kg <em className="fieldTag">transisi</em></span><div className="compactUnitInput money"><b>Rp</b><input name="sellingPricePerKg" type="number" min="1" step="1" placeholder="23000" required /></div></label>
                <label><span>Biaya panen</span><div className="compactUnitInput money"><b>Rp</b><input name="harvestCost" type="number" min="0" step="1" placeholder="0" /></div></label>
              </div>
            </div>

            <div className="formSectionBlock">
              <h3>Catatan komersial transisi</h3>
              <label><span>Pembeli langsung (opsional) <em className="fieldTag">legacy</em></span><input name="buyerName" type="text" placeholder="Kosongkan jika dikelola lewat Sales CRM" /></label>
              <label><span>Catatan panen</span><textarea name="notes" rows={3} placeholder="Grade campur, waktu panen, kualitas, packing, dll." /></label>
            </div>

            <div className="workspaceFormActions">
              <span>Setiap panen otomatis membuat HarvestLot.</span>
              <button className="workspacePrimaryButton" type="submit" disabled={cycles.length === 0}>Simpan Panen</button>
            </div>
          </form>

          <aside className="operationContextStack">
            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>FLOW</span><h2>Sesudah panen</h2></div></div>
              <ol className="workflowSteps">
                <li><b>1</b><div><strong>Harvest tersimpan</strong><span>Berat dan hasil panen masuk ke siklus.</span></div></li>
                <li><b>2</b><div><strong>HarvestLot dibuat</strong><span>Lot menjadi inventory komersial yang bisa dialokasikan.</span></div></li>
                <li><b>3</b><div><strong>Fulfillment</strong><span>Sales Order mengambil stok dari HarvestLot, bukan dari kolam langsung.</span></div></li>
              </ol>
              <Link className="contextActionLink" href="/sales/fulfillment">Buka Fulfillment →</Link>
            </section>

            <section className="workspaceCard operationContextCard">
              <div className="workspaceCardHeader"><div><span>CYCLE EFFECT</span><h2>Parsial vs final</h2></div></div>
              <div className="contextMetricList">
                <div><span>Panen Parsial</span><strong>HARVESTING</strong></div>
                <div><span>Panen Final</span><strong>COMPLETED</strong></div>
                <div><span>Final metrics</span><strong>HPP · Profit · FCR</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
