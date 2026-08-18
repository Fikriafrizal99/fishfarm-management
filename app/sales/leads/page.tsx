import { getSalesFormOptions, getSalesLeads } from "@/src/application/sales/get-sales-lists";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitLead } from "./actions";

export const dynamic = "force-dynamic";

const number1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let leads: Awaited<ReturnType<typeof getSalesLeads>> = [];
  let options: Awaited<ReturnType<typeof getSalesFormOptions>> = {
    customers: [],
    species: [],
  };
  let databaseError = false;

  try {
    [leads, options] = await Promise.all([getSalesLeads(), getSalesFormOptions()]);
  } catch {
    databaseError = true;
  }

  const dueFollowUps = leads.filter((lead) => lead.nextFollowUpAt !== null).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / ACQUISITION</p>
          <h1>Leads</h1>
          <p>Catat calon pembeli, kebutuhan, harga indikatif, dan jadwal follow-up.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{leads.length}</b> total lead</span>
          <span><b>{dueFollowUps}</b> punya follow-up</span>
        </div>
      </div>

      <SalesWorkspaceNav active="leads" />

      {params.saved === "1" ? <div className="notice successNotice">Lead berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit crmSplit">
        <form action={submitLead} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader">
            <div>
              <span>NEW LEAD</span>
              <h2>Catat calon pembeli</h2>
            </div>
            <small>Data komersial awal</small>
          </div>

          <div className="formSectionBlock">
            <h3>Identitas lead</h3>
            <label>
              <span>Judul lead</span>
              <input name="title" required placeholder="Hotel ABC — kebutuhan Nila mingguan" />
            </label>
            <div className="compactFieldGrid two">
              <label>
                <span>Produk minat</span>
                <select name="speciesId" defaultValue="">
                  <option value="">Belum ditentukan</option>
                  {options.species.map((species) => (
                    <option value={species.id} key={species.id}>{species.commonName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sumber lead</span>
                <input name="source" placeholder="Referral / WhatsApp / pasar" />
              </label>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Kontak & potensi</h3>
            <div className="compactFieldGrid two">
              <label><span>Nama kontak</span><input name="contactName" placeholder="Purchasing / pemilik" /></label>
              <label><span>WhatsApp</span><input name="whatsapp" inputMode="tel" placeholder="08..." /></label>
              <label>
                <span>Kebutuhan</span>
                <div className="compactUnitInput"><input name="expectedDemandKg" type="number" min="0.001" step="0.001" placeholder="150" /><b>kg</b></div>
              </label>
              <label>
                <span>Harga indikatif</span>
                <div className="compactUnitInput money"><b>Rp</b><input name="expectedPricePerKg" type="number" min="1" step="1" placeholder="24000" /></div>
              </label>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Follow-up</h3>
            <label><span>Next follow-up</span><input name="nextFollowUpDate" type="date" /></label>
            <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Ukuran, frekuensi order, preferensi pengiriman, dll." /></label>
          </div>

          <div className="workspaceFormActions">
            <span>Lead tidak terikat ke kolam atau siklus.</span>
            <button className="workspacePrimaryButton" type="submit" disabled={databaseError}>Simpan Lead</button>
          </div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader">
            <div>
              <span>PIPELINE</span>
              <h2>Lead tersimpan</h2>
            </div>
            <small>{leads.length} record</small>
          </div>

          <div className="recordTable leadRecordTable">
            <div className="recordTableHead">
              <span>Lead</span><span>Potensi</span><span>Follow-up</span><span>Status</span>
            </div>
            {leads.length === 0 ? (
              <div className="recordEmpty">Belum ada lead.</div>
            ) : leads.map((lead) => (
              <article className="recordTableRow" key={lead.id}>
                <div>
                  <strong>{lead.title}</strong>
                  <small>{lead.species?.commonName ?? "Produk belum ditentukan"}{lead.whatsapp ? ` · WA ${lead.whatsapp}` : ""}</small>
                </div>
                <div>
                  <strong>{lead.expectedDemandKg === null ? "—" : `${number1.format(Number(lead.expectedDemandKg))} kg`}</strong>
                  <small>{lead.expectedPricePerKg === null ? "Harga belum ada" : `${currency.format(Number(lead.expectedPricePerKg))}/kg`}</small>
                </div>
                <div>
                  <strong>{lead.nextFollowUpAt ? dateFormatter.format(lead.nextFollowUpAt) : "Belum dijadwalkan"}</strong>
                  <small>{lead.source ?? "Sumber tidak dicatat"}</small>
                </div>
                <div><span className={`statusBadge ${lead.status === "LOST" ? "danger" : lead.status === "CONVERTED" ? "good" : "warning"}`}>{lead.status}</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
