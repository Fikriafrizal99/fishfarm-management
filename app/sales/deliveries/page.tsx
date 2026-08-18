import { DeliveryStatus } from "@/src/generated/prisma/client";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { getDeliveryWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { submitDelivery, submitDeliveryStatus } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getDeliveryWorkspace>> = { orderItems: [], deliveries: [] };
  let databaseError = false;
  try {
    workspace = await getDeliveryWorkspace();
  } catch {
    databaseError = true;
  }

  const openDeliveries = workspace.deliveries.filter(
    (delivery) =>
      delivery.status !== DeliveryStatus.DELIVERED &&
      delivery.status !== DeliveryStatus.CANCELLED,
  ).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / DELIVERY</p><h1>Delivery</h1><p>Catat pengiriman fisik dari quantity order yang sudah memiliki alokasi HarvestLot.</p></div>
        <div className="workspaceHeadingStats"><span><b>{workspace.deliveries.length}</b> delivery</span><span><b>{openDeliveries}</b> masih berjalan</span></div>
      </div>

      <SalesWorkspaceNav active="deliveries" />
      {params.saved === "1" ? <div className="notice successNotice">Delivery berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="workspaceSplit crmSplit">
        <form action={submitDelivery} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader"><div><span>NEW DELIVERY</span><h2>Catat pengiriman</h2></div><small>Allocated stock only</small></div>
          <section className="formSectionBlock">
            <h3>Order & quantity</h3>
            <label><span>Order item teralokasi</span><select name="orderItemId" required defaultValue=""><option value="">Pilih order item</option>{workspace.orderItems.map((item) => <option value={item.id} key={item.id}>{item.orderNumber} · {item.customerName} · {item.species} · siap {number1.format(item.deliverableKg)} kg</option>)}</select></label>
            <label><span>Jumlah dikirim</span><div className="compactUnitInput"><input name="quantityKg" type="number" min="0.001" step="0.001" placeholder="100" required /><b>kg</b></div></label>
          </section>
          <section className="formSectionBlock">
            <h3>Pengiriman</h3>
            <div className="compactFieldGrid two">
              <label><span>Tanggal rencana</span><input name="plannedDate" type="date" defaultValue={todayInJakarta()} /></label>
              <label><span>Status awal</span><select name="status" defaultValue="PLANNED"><option value="PLANNED">Planned</option><option value="DISPATCHED">Dispatched</option><option value="DELIVERED">Delivered</option></select></label>
            </div>
            <label><span>Penerima</span><input name="recipientName" placeholder="Nama penerima / PIC customer" /></label>
          </section>
          <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan delivery</span><textarea name="notes" rows={3} placeholder="Armada, jam kirim, kondisi barang, bukti serah terima..." /></label></section>
          {workspace.orderItems.length === 0 ? <div className="workspaceInlineNotice neutral"><span>Belum ada quantity yang siap dikirim. Lakukan Fulfillment allocation terlebih dahulu.</span></div> : null}
          <div className="workspaceFormActions"><span>Quantity delivery tidak boleh melebihi stok yang sudah dialokasikan.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.orderItems.length === 0}>Simpan Delivery</button></div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader"><div><span>DELIVERY LOG</span><h2>Riwayat pengiriman</h2></div><small>{workspace.deliveries.length} record</small></div>
          <div className="recordTable deliveryRecordTable">
            <div className="recordTableHead"><span>Delivery</span><span>Quantity</span><span>Waktu</span><span>Status / Aksi</span></div>
            {workspace.deliveries.length === 0 ? <div className="recordEmpty">Belum ada delivery.</div> : workspace.deliveries.map((delivery) => {
              const quantityKg = delivery.items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
              return <div className="recordTableRow" key={delivery.id}>
                <div><strong>{delivery.deliveryNumber}</strong><small>{delivery.salesOrder.orderNumber} · {delivery.salesOrder.customer.name}</small></div>
                <div><strong>{number1.format(quantityKg)} kg</strong><small>{delivery.items.map((item) => item.orderItem.species.commonName).join(", ")}</small></div>
                <div><strong>{delivery.deliveredAt ? dateFormatter.format(delivery.deliveredAt) : delivery.dispatchedAt ? dateFormatter.format(delivery.dispatchedAt) : delivery.plannedAt ? dateFormatter.format(delivery.plannedAt) : "—"}</strong><small>{delivery.recipientName ?? "penerima belum dicatat"}</small></div>
                <div className="recordActionCell">
                  <span className={`statusBadge ${delivery.status === "DELIVERED" ? "good" : delivery.status === "CANCELLED" ? "danger" : "warning"}`}>{delivery.status}</span>
                  {delivery.status === "PLANNED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="DISPATCHED" /><button className="tableActionButton" type="submit">Dispatch</button></form> : null}
                  {delivery.status === "DISPATCHED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="DELIVERED" /><button className="tableActionButton" type="submit">Delivered</button></form> : null}
                  {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" ? <form action={submitDeliveryStatus}><input type="hidden" name="deliveryId" value={delivery.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="tableActionButton dangerText" type="submit">Cancel</button></form> : null}
                </div>
              </div>;
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
