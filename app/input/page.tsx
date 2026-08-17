import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { submitDailyInput } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export default async function InputPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; cycleId?: string }>;
}) {
  const params = await searchParams;

  let cycles: Awaited<ReturnType<typeof getActiveCycleOptions>> = [];
  let databaseError: string | null = null;

  try {
    cycles = await getActiveCycleOptions();
  } catch (error) {
    databaseError =
      error instanceof Error ? error.message : "Database belum dapat diakses";
  }

  const selectedCycleId = cycles.some((cycle) => cycle.id === params.cycleId)
    ? params.cycleId
    : "";

  return (
    <main className="shell formShell">
      <div className="topBar">
        <Link className="backLink" href="/">← Dashboard</Link>
        <span className="badge good">INPUT HARIAN</span>
      </div>

      <header className="pageHeader">
        <p className="eyebrow dark">Operasional</p>
        <h1>Catat kondisi kolam hari ini</h1>
        <p>
          Pakan, mortalitas, dan biaya dicatat sebagai raw data. Dashboard menghitung KPI dari data ini.
        </p>
      </header>

      {params.saved === "1" ? (
        <div className="notice successNotice">Data harian berhasil disimpan.</div>
      ) : null}
      {params.error ? (
        <div className="notice errorNotice">{params.error}</div>
      ) : null}
      {databaseError ? (
        <div className="notice errorNotice">
          Database belum tersambung. Form akan aktif setelah development database dijalankan.
        </div>
      ) : null}

      <form action={submitDailyInput} className="panel inputForm">
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

        <label>
          <span>Tanggal</span>
          <input name="eventDate" type="date" defaultValue={todayInJakarta()} required />
        </label>

        <div className="formGrid">
          <label>
            <span>Pakan diberikan</span>
            <div className="inputWithUnit">
              <input name="feedKg" type="number" min="0" step="0.001" placeholder="0" />
              <b>kg</b>
            </div>
          </label>

          <label>
            <span>Ikan mati</span>
            <div className="inputWithUnit">
              <input name="mortalityQty" type="number" min="0" step="1" placeholder="0" />
              <b>ekor</b>
            </div>
          </label>
        </div>

        <div className="formGrid">
          <label>
            <span>Kategori biaya tambahan</span>
            <select name="additionalExpenseCategory" defaultValue="OTHER">
              <option value="PROBIOTIC">Probiotik</option>
              <option value="MEDICINE">Obat</option>
              <option value="ELECTRICITY">Listrik</option>
              <option value="WATER">Air</option>
              <option value="LABOR">Tenaga Kerja</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="TRANSPORT">Transport</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </label>

          <label>
            <span>Biaya tambahan</span>
            <div className="inputWithUnit moneyInput">
              <b>Rp</b>
              <input
                name="additionalExpenseAmount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>
          </label>
        </div>

        <label>
          <span>Catatan</span>
          <textarea
            name="notes"
            rows={4}
            placeholder="Contoh: ikan aktif, nafsu makan normal, air sedikit keruh"
          />
        </label>

        <p className="formHint">
          Minimal isi salah satu: pakan, mortalitas, atau biaya tambahan.
        </p>

        <button className="primaryButton" type="submit" disabled={cycles.length === 0}>
          Simpan Data Harian
        </button>
      </form>
    </main>
  );
}
