import Link from "next/link";
import { getFulfillmentWorkspace } from "@/src/application/sales/get-fulfillment-workspace";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
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

  const openDemandKg = workspace.orderItems.reduce((sum, item) => sum + item.remainingKg, 0);
  const availableSupplyKg = workspace.harvestLots.reduce((sum, lot) => sum + lot.availableKg, 0);

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / SUPPLY BRIDGE</p>
          <h1>Fulfillment</h1>
          <p>Hubungkan order yang sudah dikonfirmasi dengan HarvestLot yang benar-benar tersedia.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{number1.format(openDemandKg)} kg</b> open demand</span>
          <span><b>{number1.format(availableSupplyKg)} kg</b> available</span>
        </div>
      </div>

      <SalesWorkspaceNav active="fulfillment" />

      {params.saved === "1" ? <div className="notice successNotice">Alokasi berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit fulfillmentSplit">
        <form action={submitAllocation} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader">
            <div><span>ALLOCATE</span><h2>Order ↔ HarvestLot</h2></div>
            <small>Bridge produksi ke sales</small>
          </div>

          <div className="formSectionBlock">
            <h3>Demand</h3>
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
          </div>

          <div className="formSectionBlock">
            <h3>Supply</h3>
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
              <div className="compactUnitInput"><input name="allocatedKg" type="number" min="0.001" step="0.001" required placeholder="100" /><b>kg</b></div>
            </label>
          </div>

          <div className="formSectionBlock">
            <h3>Catatan</h3>
            <label><span>Instruksi fulfillment</span><textarea name="notes" rows={3} placeholder="Reserved untuk pengiriman tanggal..." /></label>
          </div>

          {workspace.harvestLots.length === 0 ? (
            <div className="workspaceInlineNotice">
              <strong>Belum ada HarvestLot tersedia.</strong>
              <Link href="/harvest">Catat panen →</Link>
            </div>
          ) : null}

          <div className="workspaceFormActions">
            <span>Alokasi tidak mengubah asal produksi HarvestLot.</span>
            <button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.orderItems.length === 0 || workspace.harvestLots.length === 0}>Simpan Alokasi</button>
          </div>
        </form>

        <div className="fulfillmentBoards">
          <section className="workspaceCard recordWorkspaceCard compactRecordCard">
            <div className="workspaceCardHeader">
              <div><span>OPEN DEMAND</span><h2>Sisa order</h2></div>
              <small>{workspace.orderItems.length} item</small>
            </div>
            <div className="recordTable fulfillmentRecordTable">
              <div className="recordTableHead"><span>Order</span><span>Sisa</span><span>Produk</span></div>
              {workspace.orderItems.length === 0 ? (
                <div className="recordEmpty">Tidak ada order yang perlu dialokasikan.</div>
              ) : workspace.orderItems.map((item) => (
                <article className="recordTableRow" key={item.id}>
                  <div><strong>{item.orderNumber}</strong><small>{item.customerName}</small></div>
                  <div><strong>{number1.format(item.remainingKg)} kg</strong><small>dari {number1.format(item.quantityKg)} kg</small></div>
                  <div><strong>{item.species}</strong><small>sales demand</small></div>
                </article>
              ))}
            </div>
          </section>

          <section className="workspaceCard recordWorkspaceCard compactRecordCard">
            <div className="workspaceCardHeader">
              <div><span>AVAILABLE SUPPLY</span><h2>Harvest inventory</h2></div>
              <small>{workspace.harvestLots.length} lot</small>
            </div>
            <div className="recordTable fulfillmentRecordTable">
              <div className="recordTableHead"><span>HarvestLot</span><span>Tersedia</span><span>Sumber</span></div>
              {workspace.harvestLots.length === 0 ? (
                <div className="recordEmpty">Belum ada HarvestLot tersedia.</div>
              ) : workspace.harvestLots.map((lot) => (
                <article className="recordTableRow" key={lot.id}>
                  <div><strong>{lot.lotCode}</strong><small>{lot.species}</small></div>
                  <div><strong>{number1.format(lot.availableKg)} kg</strong><small>dari {number1.format(lot.quantityKg)} kg</small></div>
                  <div><strong>{lot.pondCode}</strong><small>production source</small></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
