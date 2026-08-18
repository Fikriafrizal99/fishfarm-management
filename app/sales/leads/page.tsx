import Link from "next/link";
import { getSalesFormOptions, getSalesLeads } from "@/src/application/sales/get-sales-lists";
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
  let options: Awaited<ReturnType<typeof getSalesFormOptions>> = { customers: [], species: [] };
  let databaseError = false;

  try {
    [leads, options] = await Promise.all([getSalesLeads(), getSalesFormOptions()]);
  } catch {
    databaseError = true;
  }

  return (
    <div className="opsPage salesSubPage">
      <div className="pageTitleRow salesSubTitle">
        <div>
          <Link className="detailBackLink" href="/sales">← Sales Dashboard</Link>
          <h1>Leads</h1>
          <p>Calon pembeli, potensi kebutuhan, dan jadwal follow-up.</p>
        </div>
        <span className="statusBadge good">LEADS</span>
      </div>

      <nav className="salesWorkspaceNav" aria-label="Sales CRM navigation">
        <Link href="/sales">Overview</Link>
        <Link className="active" href="/sales/leads">Leads</Link>
        <Link href="/sales/customers">Customers</Link>
        <Link href="/sales/orders">Orders</Link>
        <Link href="/sales/fulfillment">Fulfillment</Link>
      </nav>

      {params.saved === "1" ? <div className="notice successNotice">Lead berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="salesSubGrid">
        <form action={submitLead} className="workspaceCard inputForm operationalFormCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">New Lead</p><h2>Catat calon pembeli</h2></div></div>
          <label><span>Judul lead</span><input name="title" required placeholder="Hotel ABC — kebutuhan Nila mingguan" /></label>
          <div className="formGrid">
            <label><span>Species / produk minat</span><select name="speciesId" defaultValue=""><option value="">Belum ditentukan</option>{options.species.map((species) => <option value={species.id} key={species.id}>{species.commonName}</option>)}</select></label>
            <label><span>Sumber lead</span><input name="source" placeholder="Referral / WhatsApp / pasar" /></label>
          </div>
          <div className="formGrid">
            <label><span>Nama kontak</span><input name="contactName" placeholder="Purchasing / pemilik" /></label>
            <label><span>WhatsApp</span><input name="whatsapp" inputMode="tel" placeholder="08..." /></label>
          </div>
          <div className="formGrid">
            <label><span>Potensi kebutuhan</span><div className="inputWithUnit"><input name="expectedDemandKg" type="number" min="0.001" step="0.001" placeholder="150" /><b>kg</b></div></label>
            <label><span>Potensi harga/kg</span><div className="inputWithUnit moneyInput"><b>Rp</b><input name="expectedPricePerKg" type="number" min="1" step="1" placeholder="24000" /></div></label>
          </div>
          <label><span>Next follow-up</span><input name="nextFollowUpDate" type="date" /></label>
          <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Kebutuhan ukuran, frekuensi order, preferensi pengiriman, dll." /></label>
          <button className="primaryButton" type="submit" disabled={databaseError}>Simpan Lead</button>
        </form>

        <section className="workspaceCard salesListCard">
          <div className="sectionHeaderInline"><div><p className="eyebrow dark">Pipeline</p><h2>Lead tersimpan</h2></div><span className="mutedInline">{leads.length} lead</span></div>
          <div className="crmList">
            {leads.length === 0 ? <div className="emptyInline">Belum ada lead.</div> : leads.map((lead) => (
              <div className="crmRow" key={lead.id}>
                <div>
                  <strong>{lead.title}</strong>
                  <span>{lead.species?.commonName ?? "Produk belum ditentukan"}{lead.expectedDemandKg === null ? "" : ` · ${number1.format(Number(lead.expectedDemandKg))} kg`}{lead.expectedPricePerKg === null ? "" : ` · ${currency.format(Number(lead.expectedPricePerKg))}/kg`}</span>
                  {lead.whatsapp ? <span>WA {lead.whatsapp}</span> : null}
                </div>
                <div className="crmRowRight"><span className={`badge ${lead.status === "LOST" ? "danger" : lead.status === "CONVERTED" ? "good" : "warning"}`}>{lead.status}</span><small>{lead.nextFollowUpAt ? dateFormatter.format(lead.nextFollowUpAt) : "Belum ada follow-up"}</small></div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
