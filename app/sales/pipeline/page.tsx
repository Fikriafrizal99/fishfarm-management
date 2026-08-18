import Link from "next/link";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { getOpportunityWorkspace } from "@/src/application/sales/get-commercial-workspaces";
import { submitOpportunity, submitOpportunityStatus } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  let workspace: Awaited<ReturnType<typeof getOpportunityWorkspace>> = { customers: [], leads: [], species: [], opportunities: [] };
  let databaseError = false;
  try {
    workspace = await getOpportunityWorkspace();
  } catch {
    databaseError = true;
  }

  const open = workspace.opportunities.filter((item) => item.status === "OPEN");
  const pipelineValue = open.reduce((sum, item) => {
    if (item.expectedQtyKg === null || item.expectedPricePerKg === null) return sum;
    return sum + Number(item.expectedQtyKg) * Number(item.expectedPricePerKg);
  }, 0);

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div><p className="workspaceKicker">SALES CRM / PIPELINE</p><h1>Opportunity Pipeline</h1><p>Kelola demand yang sudah qualified sebelum dikonversi menjadi Sales Order.</p></div>
        <div className="workspaceHeadingStats"><span><b>{open.length}</b> opportunity open</span><span><b>{currency.format(pipelineValue)}</b> pipeline value</span></div>
      </div>

      <SalesWorkspaceNav active="pipeline" />
      {params.saved === "1" ? <div className="notice successNotice">Opportunity berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="workspaceSplit crmSplit">
        <form action={submitOpportunity} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader"><div><span>NEW OPPORTUNITY</span><h2>Qualified demand</h2></div><small>Commercial forecast</small></div>
          <section className="formSectionBlock">
            <h3>Account & source</h3>
            <label><span>Customer</span><select name="customerId" defaultValue="" required><option value="">Pilih customer</option>{workspace.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.customerType}</option>)}</select></label>
            <div className="compactFieldGrid two">
              <label><span>Asal lead (opsional)</span><select name="leadId" defaultValue=""><option value="">Tanpa lead</option>{workspace.leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.title}</option>)}</select></label>
              <label><span>Produk / species</span><select name="speciesId" defaultValue=""><option value="">Belum ditentukan</option>{workspace.species.map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}</select></label>
            </div>
          </section>
          <section className="formSectionBlock">
            <h3>Opportunity</h3>
            <label><span>Judul opportunity</span><input name="title" required placeholder="Pasokan Nila mingguan — Customer A" /></label>
            <div className="compactFieldGrid two">
              <label><span>Estimasi quantity</span><div className="compactUnitInput"><input name="expectedQtyKg" type="number" min="0.001" step="0.001" placeholder="100" /><b>kg</b></div></label>
              <label><span>Estimasi harga</span><div className="compactUnitInput money"><b>Rp</b><input name="expectedPricePerKg" type="number" min="1" step="1" placeholder="23500" /></div></label>
            </div>
            <label><span>Estimasi closing</span><input name="expectedCloseDate" type="date" /></label>
          </section>
          <section className="formSectionBlock"><h3>Catatan</h3><label><span>Catatan komersial</span><textarea name="notes" rows={3} placeholder="Ukuran, frekuensi, negosiasi harga, syarat khusus..." /></label></section>
          <div className="workspaceFormActions"><span>Lead yang dipilih otomatis menjadi QUALIFIED.</span><button className="workspacePrimaryButton" type="submit" disabled={databaseError || workspace.customers.length === 0}>Simpan Opportunity</button></div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader"><div><span>PIPELINE</span><h2>Opportunity tersimpan</h2></div><small>{workspace.opportunities.length} record</small></div>
          <div className="recordTable opportunityRecordTable">
            <div className="recordTableHead"><span>Opportunity</span><span>Potensi</span><span>Closing</span><span>Status / Aksi</span></div>
            {workspace.opportunities.length === 0 ? <div className="recordEmpty">Belum ada opportunity.</div> : workspace.opportunities.map((item) => {
              const value = item.expectedQtyKg !== null && item.expectedPricePerKg !== null ? Number(item.expectedQtyKg) * Number(item.expectedPricePerKg) : null;
              return <div className="recordTableRow" key={item.id}>
                <div><strong>{item.title}</strong><small>{item.customer.name}{item.species ? ` · ${item.species.commonName}` : ""}{item.lead ? ` · from ${item.lead.title}` : ""}</small></div>
                <div><strong>{item.expectedQtyKg === null ? "—" : `${number1.format(Number(item.expectedQtyKg))} kg`}</strong><small>{value === null ? "nilai belum lengkap" : currency.format(value)}</small></div>
                <div><strong>{item.expectedCloseDate ? dateFormatter.format(item.expectedCloseDate) : "—"}</strong><small>{item.salesOrders[0]?.orderNumber ?? "belum ada order"}</small></div>
                <div className="recordActionCell">
                  <span className={`statusBadge ${item.status === "WON" ? "good" : item.status === "LOST" ? "danger" : "warning"}`}>{item.status}</span>
                  {item.status === "OPEN" ? <><Link className="tableActionLink" href={`/sales/orders?opportunityId=${encodeURIComponent(item.id)}&customerId=${encodeURIComponent(item.customerId)}${item.speciesId ? `&speciesId=${encodeURIComponent(item.speciesId)}` : ""}`}>Buat order</Link><form action={submitOpportunityStatus}><input type="hidden" name="opportunityId" value={item.id} /><input type="hidden" name="status" value="LOST" /><button className="tableActionButton dangerText" type="submit">Lost</button></form></> : null}
                </div>
              </div>;
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
