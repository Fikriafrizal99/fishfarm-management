import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { HarvestIcon } from "@/app/_components/icons";
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
      <div className="opsPage formWorkspacePage">
        <div className="pageTitleRow formPageTitle">
          <div>
            <Link className="detailBackLink" href="/budidaya">← Kembali ke Budidaya</Link>
            <h1>Catat Panen</h1>
            <p>Panen menghasilkan HarvestLot. Alokasi ke order dilakukan terpisah melalui Sales CRM.</p>
          </div>
          <span className="statusBadge warning"><HarvestIcon size={12} /> PANEN</span>
        </div>

        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung. Form akan aktif setelah development database dijalankan.</div> : null}

        <form action={submitHarvest} className="workspaceCard inputForm operationalFormCard">
          <label>
            <span>Kolam / Siklus</span>
            <select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}>
              <option value="">Pilih kolam</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
            </select>
          </label>

          <div className="formGrid">
            <label>
              <span>Tanggal panen</span>
              <input name="harvestedDate" type="date" defaultValue={todayInJakarta()} required />
            </label>
            <label>
              <span>Jenis panen</span>
              <select name="harvestType" defaultValue="PARTIAL" required>
                <option value="PARTIAL">Panen Parsial</option>
                <option value="FINAL">Panen Final / Tutup Siklus</option>
              </select>
            </label>
          </div>

          <div className="formGrid">
            <label>
              <span>Berat panen</span>
              <div className="inputWithUnit"><input name="weightKg" type="number" min="0.001" step="0.001" placeholder="810" required /><b>kg</b></div>
            </label>
            <label>
              <span>Jumlah ikan (opsional)</span>
              <div className="inputWithUnit"><input name="fishCount" type="number" min="1" step="1" placeholder="Isi jika dihitung" /><b>ekor</b></div>
            </label>
          </div>

          <div className="formGrid">
            <label>
              <span>Harga realisasi per kg <em className="fieldTag">transisi V0.8</em></span>
              <div className="inputWithUnit moneyInput"><b>Rp</b><input name="sellingPricePerKg" type="number" min="1" step="1" placeholder="23000" required /></div>
            </label>
            <label>
              <span>Biaya panen (opsional)</span>
              <div className="inputWithUnit moneyInput"><b>Rp</b><input name="harvestCost" type="number" min="0" step="1" placeholder="0" /></div>
            </label>
          </div>

          <label>
            <span>Pembeli langsung (opsional) <em className="fieldTag">legacy</em></span>
            <input name="buyerName" type="text" placeholder="Kosongkan jika penjualan dikelola melalui Sales CRM" />
          </label>

          <label>
            <span>Catatan panen</span>
            <textarea name="notes" rows={4} placeholder="Contoh: grade campur, panen selesai pukul 08.30, kualitas baik" />
          </label>

          <div className="infoBox harvestWarning">
            <strong>Boundary Produksi ↔ Sales</strong>
            <span>Setiap panen membuat HarvestLot. Order tidak menunjuk kolam secara langsung; gunakan Fulfillment untuk mengalokasikan HarvestLot ke Sales Order.</span>
            <Link className="inlineInfoLink" href="/sales/fulfillment">Buka Fulfillment →</Link>
          </div>
          <div className="infoBox">
            <strong>Panen Final</strong>
            <span>Panen Final mengubah siklus menjadi COMPLETED dan mengaktifkan Actual HPP, laba, margin, serta Final FCR.</span>
          </div>

          <button className="primaryButton" type="submit" disabled={cycles.length === 0}>Simpan Panen</button>
        </form>
      </div>
    </AppFrame>
  );
}
