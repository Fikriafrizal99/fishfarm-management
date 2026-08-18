import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { SamplingIcon } from "@/app/_components/icons";
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
      <div className="opsPage formWorkspacePage">
        <div className="pageTitleRow formPageTitle">
          <div>
            <Link className="detailBackLink" href="/budidaya">← Kembali ke Budidaya</Link>
            <h1>Sampling & Pertumbuhan</h1>
            <p>Perbarui ABW, estimasi biomassa, growth trend, dan FCR dari hasil sampling.</p>
          </div>
          <span className="statusBadge good"><SamplingIcon size={12} /> SAMPLING</span>
        </div>

        {params.saved === "1" ? <div className="notice successNotice">Sampling berhasil disimpan. KPI sudah dihitung ulang.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung. Form akan aktif setelah development database dijalankan.</div> : null}

        <form action={submitSampling} className="workspaceCard inputForm operationalFormCard">
          <label>
            <span>Kolam / Siklus</span>
            <select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}>
              <option value="">Pilih kolam</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
            </select>
          </label>

          <label>
            <span>Tanggal sampling</span>
            <input name="sampledDate" type="date" defaultValue={todayInJakarta()} required />
          </label>

          <div className="formGrid">
            <label>
              <span>Jumlah ikan sampel</span>
              <div className="inputWithUnit"><input name="sampleCount" type="number" min="1" step="1" placeholder="30" required /><b>ekor</b></div>
            </label>
            <label>
              <span>Total berat sampel</span>
              <div className="inputWithUnit"><input name="totalSampleWeightKg" type="number" min="0.001" step="0.001" placeholder="8.1" /><b>kg</b></div>
            </label>
          </div>

          <div className="formGrid">
            <label>
              <span>Bobot rata-rata (opsional)</span>
              <div className="inputWithUnit"><input name="averageWeightG" type="number" min="0.001" step="0.001" placeholder="270" /><b>g</b></div>
            </label>
            <label>
              <span>Panjang rata-rata (opsional)</span>
              <div className="inputWithUnit"><input name="averageLengthCm" type="number" min="0.001" step="0.001" placeholder="18.5" /><b>cm</b></div>
            </label>
          </div>

          <label>
            <span>Populasi teramati (opsional)</span>
            <div className="inputWithUnit"><input name="observedPopulation" type="number" min="1" step="1" placeholder="Isi hanya jika ada penghitungan populasi" /><b>ekor</b></div>
          </label>

          <label>
            <span>Catatan sampling</span>
            <textarea name="notes" rows={4} placeholder="Contoh: ukuran relatif seragam, nafsu makan baik, tidak ada luka terlihat" />
          </label>

          <div className="infoBox"><strong>Validasi sampling</strong><span>Isi minimal total berat sampel atau bobot rata-rata. Jika keduanya diisi, server mengecek konsistensinya.</span></div>
          <button className="primaryButton" type="submit" disabled={cycles.length === 0}>Simpan Sampling</button>
        </form>
      </div>
    </AppFrame>
  );
}
