import Link from "next/link";
import { getActiveCycleOptions } from "@/src/application/cycles/get-active-cycle-options";
import { getAppShellContext } from "@/src/application/navigation/get-app-shell-context";
import { AppFrame } from "@/app/_components/app-frame";
import { CostIcon } from "@/app/_components/icons";
import { submitExpense } from "./actions";

export const dynamic = "force-dynamic";

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function ExpensesPage({
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
            <h1>Catat Biaya</h1>
            <p>Pengeluaran operasional tambahan dicatat sebagai raw cost pada siklus.</p>
          </div>
          <span className="statusBadge good"><CostIcon size={12} /> BIAYA</span>
        </div>

        {params.saved === "1" ? <div className="notice successNotice">Biaya berhasil disimpan.</div> : null}
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

        <form action={submitExpense} className="workspaceCard inputForm operationalFormCard">
          <label>
            <span>Kolam / Siklus</span>
            <select name="cycleId" required disabled={cycles.length === 0} defaultValue={selectedCycleId}>
              <option value="">Pilih kolam</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}
            </select>
          </label>

          <div className="formGrid">
            <label>
              <span>Tanggal biaya</span>
              <input name="eventDate" type="date" defaultValue={todayInJakarta()} required />
            </label>
            <label>
              <span>Kategori</span>
              <select name="category" defaultValue="OTHER">
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
          </div>

          <label>
            <span>Nominal biaya</span>
            <div className="inputWithUnit moneyInput"><b>Rp</b><input name="amount" type="number" min="1" step="1" placeholder="0" required /></div>
          </label>

          <label>
            <span>Catatan</span>
            <textarea name="notes" rows={4} placeholder="Contoh: pembelian probiotik, listrik pompa, transport, perbaikan aerasi" />
          </label>

          <div className="infoBox"><strong>Cost ledger</strong><span>Biaya ini menambah running cost siklus dan memengaruhi estimasi biaya/kg biomassa serta HPP final.</span></div>
          <button className="primaryButton" type="submit" disabled={cycles.length === 0}>Simpan Biaya</button>
        </form>
      </div>
    </AppFrame>
  );
}
