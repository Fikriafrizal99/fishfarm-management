import Link from "next/link";
import { DeliveryStatus } from "@/src/generated/prisma/client";
import { getFulfillmentWorkspace } from "@/src/application/sales/get-fulfillment-workspace";
import { getDeliveryWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitAllocation } from "./actions";
import { submitDelivery, submitDeliveryStatus } from "@/app/sales/deliveries/actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function FulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deliverySaved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getFulfillmentWorkspace>> = { orderItems: [], harvestLots: [] };
  let deliveryWorkspace: Awaited<ReturnType<typeof getDeliveryWorkspace>> = { orderItems: [], deliveries: [] };
  let databaseError = false;

  try {
    [workspace, deliveryWorkspace] = await Promise.all([getFulfillmentWorkspace(), getDeliveryWorkspace()]);
  } catch {
    databaseError = true;
  }

  const openDemandKg = workspace.orderItems.reduce((sum, item) => sum + item.remainingKg, 0);
  const availableSupplyKg = workspace.harvestLots.reduce((sum, lot) => sum + lot.availableKg, 0);
  const deliverableKg = deliveryWorkspace.orderItems.reduce((sum, item) => sum + item.deliverableKg, 0);
  const openDeliveries = deliveryWorkspace.deliveries.filter((delivery) => delivery.status !== DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.CANCELLED).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / FULFILLMENT</p>
          <h1>Fulfillment</h1>
          <p>Alokasikan HarvestLot ke order, lalu kelola pengiriman fisik sampai delivered dalam satu workspace.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{number1.format(openDemandKg)} kg</b> open demand</span>
          <span><b>{number1.format(availableSupplyKg)} kg</b> harvest stock</span>
          <span><b>{number1.format(deliverableKg)} kg</b> siap kirim</span>
          <span><b>{openDeliveries}</b> delivery berjalan</span>
        </div>
      </div>

      <SalesWorkspaceNav active="fulfillment" />
      <div className="crmSubflowTabs"><a href="#allocation">Allocation</a><b>/</b><a href="#delivery">Delivery</a></div>

      {params.saved === "1" ? <div className="notice successNotice">Alokasi berhasil disimpan.</div> : null}
      {params.deliverySaved === "1" ? <div className="notice successNotice">Delivery berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="crmFlowSection" id="allocation">
        <div className="crmFlowSectionHeader"><div><p className="eyebrow dark">SUPPLY ALLOCATION</p><h2>Order ↔ HarvestLot</h2></div><span>Reservation sebelum delivery</span></div>
        <div className="workspaceSplit fulfillmentSplit">
          <form action={submitAllocation} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>ALLOCATE</span><h2>Alokasikan stok</h2></div><small>Bridge produksi ke sales</small></div>
            <div className="formSectionBlock">
              <h3>Demand</h3>
              <label><span>Order yang belum terpenuhi</span><select name="orderItemId" required defaultValue=""><option value="">Pilih order item</option>{workspace.orderItems.map((item) => <option value={item.id} key={item.id}>{item.orderNumber} · {item.customerName} · {item.species} · sisa {number1.format(item.remainingKg)} kg</option>)}</select></label>
            </div>
            <div className="formSectionBlock">
              <h3>Supply</h3>
              <label><span>Harvest lot tersedia</span><select name="harvestLotId" required defaultValue=""><option value="">Pilih harvest lot</option>{workspace.harvestLots.map((lot) => <option value={lot.id} key={lot.id}>{lot.lotCode} · {lot.species} · {lot.pondCode} · tersedia {number1.format(lot.availableKg)} kg</option>)}</select></label>
              <label><span>Jumlah alokasi</span><div className="compactUnitInput"><input name="allocatedKg" type="number" min="0.001" step="0.001" required placeholder="100" /><b>kg</b></div></label>
            </div>
            <div className="formSectionBlock"><h3>Catatan</h3><label><span>Instruksi fulfillment</span><textarea name="notes" rows={3} placeholder="Reserved untuk pengiriman tanggal..." /></label></div>
            {workspace.harvestLots.length === 0 ? <div className="workspaceInlineNotice"><strong>Belum ada HarvestLot tersedia.</strong><Link href="/harvest">Catat panen →</Link></div> : null}
            <div className="workspaceFormActions"><span>Allocation hanya mereservasi stok. Status FULFILLED menunggu delivery aktual.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.orderItems.length === 0 || workspace.harvestLots.length === 0}>Simpan Alokasi</button></div>
          </form>

          <div className="fulfillmentBoards">
            <section className="workspaceCard recordWorkspaceCard compactRecordCard">
              <div className="workspaceCardHeader"><div><span>OPEN DEMAND</span><h2>Sisa order</h2></div><small>{workspace.orderItems.length} item</small></div>
              <div className="recordTable fulfillmentRecordTable"><div className="recordTableHead"><span>Order</span><span>Sisa</span><span>Produk</span></div>{workspace.orderItems.length === 0 ? <div className="recordEmpty">Tidak ada order yang perlu dialokasikan.</div> : workspace.orderItems.map((item) => <article className="recordTableRow" key={item.id}><div><strong>{item.orderNumber}</strong><small>{item.customerName}</small></div><div><strong>{number1.format(item.remainingKg)} kg</strong><small>dari {number1.format(item.quantityKg)} kg</small></div><div><strong>{item.species}</strong><small>sales demand</small></div></article>)}</div>
            </section>
            <section className="workspaceCard recordWorkspaceCard compactRecordCard">
              <div className="workspaceCardHeader"><div><span>AVAILABLE SUPPLY</span><h2>Harvest inventory</h2></div><small>{workspace.harvestLots.length} lot</small></div>
              <div className="recordTable fulfillmentRecordTable"><div className="recordTableHead"><span>HarvestLot</span><span>Tersedia</span><span>Sumber</span></div>{workspace.harvestLots.length === 0 ? <div className="recordEmpty">Belum ada HarvestLot tersedia.</div> : workspace.harvestLots.map((lot) => <article className="recordTableRow" key={lot.id}><div><strong>{lot.lotCode}</strong><small>{lot.species}</small></div><div><strong>{number1.format(lot.availableKg)} kg</strong><small>dari {number1.format(lot.quantityKg)} kg</small></div><div><strong>{lot.pondCode}</strong><small>production source</small></div></article>)}</div>
            </section>
          </div>
        </div>
      </section>

      <section className="crmFlowSection" id="delivery">
        <div className="crmFlowSectionHeader"><div><p className="eyebrow dark">DELIVERY</p><h2>Pengiriman customer</h2></div><span>Hanya quantity yang sudah dialokasikan</span></div>
        <div className="workspaceSplit crmSplit">
          <form action={submitDelivery} className="workspaceCard operationalWorkspaceForm">
            <div className="workspaceCardHeader"><div><span>NEW DELIVERY</span><h2>Catat pengiriman</h2></div><small>Allocated stock only</small></div>
            <section className="formSectionBlock"><h3>Order & quantity</h3><label><span>Order item teralokasi</span><select name="orderItemId" required defaultValue=""><option value="">Pilih order item</option>{deliveryWorkspace.orderItems.map((item) => <option value={item.id} key={item.id}>{item.orderNumber} · {item.customerName} · {item.species} · siap {number1.format(item.deliverableKg)} kg</option>)}</select></label><label><span>Jumlah dikirim</span><div className="compactUnitInput"><input name="quantityKg" type="number" min="0.001" step="0.001" placeholder="100" required /><b>kg</b></div></label></section>
            <section className="formSectionBlock"><h3>Pengiriman</h3><div className="compactFieldGrid two"><label><span>Tanggal rencana</span><input name="plannedDate" type="date" defaultValue={todayInJakarta()} /></label><label><span>Status awal</span><select name="status" defaultValue="PLANNED"><option value="PLANNED">Planned</option><option value="DISPATCHED">Dispatched</option><option value="DELIVERED">Delivered</option></select></label></div><label><span>Penerima</span><input name="recipientName" placeholder="Nama penerima / PIC customer" /></label></section>
            <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan delivery</span><textarea name="notes" rows={3} placeholder="Armada, jam kirim, kondisi barang, bukti serah terima..." /></label></section>
            {deliveryWorkspace.orderItems.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Belum ada quantity siap dikirim. Lakukan allocation di bagian atas.</span></div> : null}
            <div className="workspaceFormActions"><span>PLANNED/DISPATCHED belum menyelesaikan order. Hanya DELIVERED yang menghitung fulfillment aktual.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || deliveryWorkspace.orderItems.length === 0}>Simpan Delivery</button></div>
          </form>

          <section className="workspaceCard recordWorkspaceCard">
            <div className="workspaceCardHeader"><div><span>DELIVERY LOG</span><h2>Riwayat pengiriman</h2></div><small>{deliveryWorkspace.deliveries.length} record</small></div>
            <div className="recordTable deliveryRecordTable"><div className="recordTableHead"><span>Delivery</span><span>Quantity</span><span>Waktu</span><span>Status / Aksi</span></div>{deliveryWorkspace.deliveries.length === 0 ? <div className="recordEmpty">Belum ada delivery.</div> : deliveryWorkspace.deliveries.map((delivery) => { const quantityKg = delivery.items.reduce((sum, item) => sum + Number(item.quantityKg), 0); return <div className="recordTableRow" key={delivery.id}><div><strong>{delivery.deliveryNumber}</strong><small>{delivery.salesOrder.orderNumber} · {delivery.salesOrder.customer.name}</small></div><div><strong>{number1.format(quantityKg)} kg</strong><small>{delivery.items.map((item) => item.orderItem.species.commonName).join(", ")}</small></div><div><strong>{delivery.deliveredAt ? dateFormatter.format(delivery.deliveredAt) : delivery.dispatchedAt ? dateFormatter.format(delivery.dispatchedAt) : delivery.plannedAt ? dateFormatter.format(delivery.plannedAt) : "—"}</strong><small>{delivery.recipientName ?? "penerima belum dicatat"}</small></div><div className="recordActionCell"><span className={`statusBadge ${delivery.status === "DELIVERED" ? "good" : delivery.status === "CANCELLED" ? "danger" : "warning"}`}>{delivery.status}</span>{delivery.status === "PLANNED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="DISPATCHED" /><button className="tableActionButton" type="submit">Dispatch</button></form> : null}{delivery.status === "DISPATCHED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="DELIVERED" /><button className="tableActionButton" type="submit">Delivered</button></form> : null}{delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="tableActionButton dangerText" type="submit">Cancel</button></form> : null}</div></div>; })}</div>
          </section>
        </div>
      </section>
    </div>
  );
}
