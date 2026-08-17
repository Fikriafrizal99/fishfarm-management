import Link from "next/link";
import { getFulfillmentWorkspace } from "@/src/application/sales/get-fulfillment-workspace";
import { submitAllocation } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function FulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getFulfillmentWorkspace>> = {
    orderItems: [],
    harvestLots: [],
  };
  let databaseError = false;

  try {
    workspace = await getFulfillmentWorkspace();
  } catch {
    databaseError = true;
  }

  return (
    <main className="shell salesShell">
      <div className="topBar">
        <Link className="backLink" href="/sales">← Sales Dashboard</Link>
        <span className="badge good">FULFILLMENT</span>
      </div>

      <header className="pageHeader">
        <p className="eyebrow dark">Sales ↔ Production Bridge</p>
        <h1>Alokasi hasil panen</h1>
        <p>Hanya halaman ini yang mengikat kebutuhan order dengan HarvestLot tertentu. Lead, customer, dan order tetap independen dari kolam.</p>
      </header>

      {params.saved === "1" ? <div className="notice successNotice">Alokasi berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="twoColumn salesWorkspace">
        <form action={submitAllocation} className="panel inputForm">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Allocate</p>
              <h2>Order ↔ Harvest Lot</h2>
            </div>
          </div>

          <label>
            <span>Order yang belum terpenuhi</span>
            <select name="orderItemId" required defaultValue="">
              <option value="">Pilih order item</option>
              {workspace.orderItems.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.orderNumber} · {item.customerName} · {item.species} · sisa {number1.format(item.remainingKg)} kg
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Harvest lot tersedia</span>
            <select name="harvestLotId" required defaultValue="">
              <option value="">Pilih harvest lot</option>
              {workspace.harvestLots.map((lot) => (
                <option value={lot.id} key={lot.id}>
                  {lot.lotCode} · {lot.species} · {lot.pondCode} · tersedia {number1.format(lot.availableKg)} kg
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Jumlah alokasi</span>
            <div className="inputWithUnit">
              <input name="allocatedKg" type="number" min="0.001" step="0.001" required placeholder="100" />
              <b>kg</b>
            </div>
          </label>

          <label>
            <span>Catatan</span>
            <textarea name="notes" rows={3} placeholder="Reserved untuk pengiriman tanggal..." />
          </label>

          {workspace.harvestLots.length === 0 ? (
            <div className="infoBox">
              <strong>Belum ada stok hasil panen</strong>
              <span>Order tetap tersimpan. Setelah panen dicatat, HarvestLot otomatis muncul di sini.</span>
            </div>
          ) : null}

          <button
            className="primaryButton"
            type="submit"
            disabled={
              databaseError ||
              workspace.orderItems.length === 0 ||
              workspace.harvestLots.length === 0
            }
          >
            Simpan Alokasi
          </button>
        </form>

        <section className="panel">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Availability</p>
              <h2>Supply & demand terbuka</h2>
            </div>
          </div>

          <h3 className="sectionLabel">Sisa order</h3>
          <div className="crmList compactCrmList">
            {workspace.orderItems.length === 0 ? <div className="emptyInline">Semua order sudah dialokasikan atau belum ada order.</div> : workspace.orderItems.map((item) => (
              <div className="crmRow" key={item.id}>
                <div>
                  <strong>{item.orderNumber} · {item.customerName}</strong>
                  <span>{item.species}</span>
                </div>
                <div className="crmRowRight">
                  <strong>{number1.format(item.remainingKg)} kg</strong>
                  <small>sisa dari {number1.format(item.quantityKg)} kg</small>
                </div>
              </div>
            ))}
          </div>

          <h3 className="sectionLabel">Harvest lot</h3>
          <div className="crmList compactCrmList">
            {workspace.harvestLots.length === 0 ? <div className="emptyInline">Belum ada HarvestLot tersedia.</div> : workspace.harvestLots.map((lot) => (
              <div className="crmRow" key={lot.id}>
                <div>
                  <strong>{lot.lotCode} · {lot.species}</strong>
                  <span>Sumber {lot.pondCode}</span>
                </div>
                <div className="crmRowRight">
                  <strong>{number1.format(lot.availableKg)} kg</strong>
                  <small>dari {number1.format(lot.quantityKg)} kg</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <footer>Fulfillment adalah integration boundary antara Budidaya dan Sales CRM.</footer>
    </main>
  );
}
