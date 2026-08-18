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
    <div className="opsPage salesSubPage">
      <div className="pageTitleRow salesSubTitle">
        <div>
          <Link className="detailBackLink" href="/sales">← Sales Dashboard</Link>
          <h1>Fulfillment</h1>
          <p>Integration boundary antara Sales Order dan HarvestLot.</p>
        </div>
        <span className="statusBadge good">FULFILLMENT</span>
      </div>

      <nav className="salesWorkspaceNav" aria-label="Sales CRM navigation">
        <Link href="/sales">Overview</Link>
        <Link href="/sales/leads">Leads</Link>
        <Link href="/sales/customers">Customers</Link>
        <Link href="/sales/orders">Orders</Link>
        <Link className="active" href="/sales/fulfillment">Fulfillment</Link>
      </nav>

      {params.saved === "1" ? <div className="notice successNotice">Alokasi berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="salesSubGrid">
        <form action={submitAllocation} className="workspaceCard inputForm operationalFormCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Allocate</p><h2>Order ↔ Harvest Lot</h2></div></div>

          <label>
            <span>Order yang belum terpenuhi</span>
            <select name="orderItemId" required defaultValue="">
              <option value="">Pilih order item</option>
              {workspace.orderItems.map((item) => <option value={item.id} key={item.id}>{item.orderNumber} · {item.customerName} · {item.species} · sisa {number1.format(item.remainingKg)} kg</option>)}
            </select>
          </label>

          <label>
            <span>Harvest lot tersedia</span>
            <select name="harvestLotId" required defaultValue="">
              <option value="">Pilih harvest lot</option>
              {workspace.harvestLots.map((lot) => <option value={lot.id} key={lot.id}>{lot.lotCode} · {lot.species} · {lot.pondCode} · tersedia {number1.format(lot.availableKg)} kg</option>)}
            </select>
          </label>

          <label><span>Jumlah alokasi</span><div className="inputWithUnit"><input name="allocatedKg" type="number" min="0.001" step="0.001" required placeholder="100" /><b>kg</b></div></label>
          <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Reserved untuk pengiriman tanggal..." /></label>

          {workspace.harvestLots.length === 0 ? <div className="infoBox"><strong>Belum ada stok hasil panen</strong><span>Order tetap tersimpan. Setelah panen dicatat, HarvestLot otomatis muncul di sini.</span><Link className="textLink" href="/harvest">Catat panen →</Link></div> : null}

          <button className="primaryButton" type="submit" disabled={databaseError || workspace.orderItems.length === 0 || workspace.harvestLots.length === 0}>Simpan Alokasi</button>
        </form>

        <section className="workspaceCard salesListCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Availability</p><h2>Supply & demand terbuka</h2></div></div>
          <h3 className="sectionLabel">Sisa order</h3>
          <div className="crmList compactCrmList">
            {workspace.orderItems.length === 0 ? <div className="emptyInline">Semua order sudah dialokasikan atau belum ada order.</div> : workspace.orderItems.map((item) => (
              <div className="crmRow" key={item.id}><div><strong>{item.orderNumber} · {item.customerName}</strong><span>{item.species}</span></div><div className="crmRowRight"><strong>{number1.format(item.remainingKg)} kg</strong><small>sisa dari {number1.format(item.quantityKg)} kg</small></div></div>
            ))}
          </div>

          <h3 className="sectionLabel">Harvest lot</h3>
          <div className="crmList compactCrmList">
            {workspace.harvestLots.length === 0 ? <div className="emptyInline">Belum ada HarvestLot tersedia.</div> : workspace.harvestLots.map((lot) => (
              <div className="crmRow" key={lot.id}><div><strong>{lot.lotCode} · {lot.species}</strong><span>Sumber {lot.pondCode}</span></div><div className="crmRowRight"><strong>{number1.format(lot.availableKg)} kg</strong><small>dari {number1.format(lot.quantityKg)} kg</small></div></div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
