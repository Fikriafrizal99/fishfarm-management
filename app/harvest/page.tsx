import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
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
  let databaseError = false;

  try {
    cycles = await getActiveCycleOptions();
  } catch {
    databaseError = true;
  }

  const selectedCycleId = cycles.some((cycle) => cycle.id === params.cycleId)
    ? params.cycleId
    : "";

  return (
    <main className="shell formShell">
      <div className="topBar">
        <Link className="backLink" href="/">← Dashboard</Link>
        <span className="badge warning">PANEN & PENJUALAN</span>
      </div>

      <header className="pageHeader">
        <p className="eyebrow dark">Harvest</p>
        <h1>Catat panen dan penjualan</h1>
        <p>
          Panen parsial mempertahankan siklus dalam status harvesting. Panen final menutup siklus dan mengaktifkan perhitungan Actual HPP, laba, margin, dan Final FCR.
        </p>
      </header>

      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? (
        <div className="notice errorNotice">
          Database belum tersambung. Form akan aktif setelah development database dijalankan.
        </div>
      ) : null}

      <form action={submitHarvest} className="panel inputForm">
        <label>
          <span>Kolam / Siklus</span>
          <select
            name="cycleId"
            required
            disabled={cycles.length === 0}
            defaultValue={selectedCycleId}
          >
            <option value="">Pilih kolam</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label}
              </option>
            ))}
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
            <div className="inputWithUnit">
              <input name="weightKg" type="number" min="0.001" step="0.001" placeholder="810" required />
              <b>kg</b>
            </div>
          </label>

          <label>
            <span>Jumlah ikan (opsional)</span>
            <div className="inputWithUnit">
              <input name="fishCount" type="number" min="1" step="1" placeholder="Isi jika dihitung" />
              <b>ekor</b>
            </div>
          </label>
        </div>

        <div className="formGrid">
          <label>
            <span>Harga jual per kg</span>
            <div className="inputWithUnit moneyInput">
              <b>Rp</b>
              <input
                name="sellingPricePerKg"
                type="number"
                min="1"
                step="1"
                placeholder="23000"
                required
              />
            </div>
          </label>

          <label>
            <span>Biaya panen (opsional)</span>
            <div className="inputWithUnit moneyInput">
              <b>Rp</b>
              <input name="harvestCost" type="number" min="0" step="1" placeholder="0" />
            </div>
          </label>
        </div>

        <label>
          <span>Pembeli</span>
          <input name="buyerName" type="text" placeholder="Contoh: pengepul / restoran / pasar" />
        </label>

        <label>
          <span>Catatan</span>
          <textarea
            name="notes"
            rows={4}
            placeholder="Contoh: grade campur, pembayaran tunai, panen selesai pukul 08.30"
          />
        </label>

        <div className="infoBox harvestWarning">
          <strong>Panen Final</strong>
          <span>
            Memilih Panen Final akan mengubah siklus menjadi COMPLETED. Setelah itu input harian dan sampling tidak dapat ditambahkan ke siklus tersebut.
          </span>
        </div>

        <button className="primaryButton" type="submit" disabled={cycles.length === 0}>
          Simpan Panen
        </button>
      </form>
    </main>
  );
}
