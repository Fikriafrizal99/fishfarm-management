import { getSalesCustomers } from "@/src/application/sales/get-sales-lists";
import { SalesWorkspaceNav } from "@/app/_components/workspace-nav";
import { submitCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let customers: Awaited<ReturnType<typeof getSalesCustomers>> = [];
  let databaseError = false;

  try {
    customers = await getSalesCustomers();
  } catch {
    databaseError = true;
  }

  const activeCustomers = customers.filter((customer) => customer.active).length;

  return (
    <div className="opsPage crmWorkspacePage">
      <div className="workspaceHeadingRow">
        <div>
          <p className="workspaceKicker">SALES CRM / ACCOUNTS</p>
          <h1>Customers</h1>
          <p>Master data pembeli, contact person, alamat, dan preferensi komersial.</p>
        </div>
        <div className="workspaceHeadingStats">
          <span><b>{customers.length}</b> customer</span>
          <span><b>{activeCustomers}</b> aktif</span>
        </div>
      </div>

      <SalesWorkspaceNav active="customers" />

      {params.saved === "1" ? <div className="notice successNotice">Customer berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <div className="workspaceSplit crmSplit">
        <form action={submitCustomer} className="workspaceCard operationalWorkspaceForm">
          <div className="workspaceCardHeader">
            <div><span>NEW CUSTOMER</span><h2>Tambah account pembeli</h2></div>
            <small>Master komersial</small>
          </div>

          <div className="formSectionBlock">
            <h3>Account</h3>
            <label><span>Nama customer</span><input name="name" required placeholder="RM Sederhana Cianjur" /></label>
            <label>
              <span>Tipe customer</span>
              <select name="customerType" defaultValue="OTHER">
                <option value="RESTAURANT">Restaurant</option>
                <option value="WHOLESALER">Pengepul / Wholesaler</option>
                <option value="RETAILER">Retailer</option>
                <option value="MARKET">Pasar</option>
                <option value="HOTEL">Hotel</option>
                <option value="CATERING">Catering</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </label>
          </div>

          <div className="formSectionBlock">
            <h3>Kontak</h3>
            <div className="compactFieldGrid two">
              <label><span>Contact person</span><input name="contactPerson" placeholder="Pak/Bu..." /></label>
              <label><span>WhatsApp</span><input name="whatsapp" inputMode="tel" placeholder="08..." /></label>
              <label><span>Telepon</span><input name="phone" inputMode="tel" /></label>
              <label><span>Email</span><input name="email" type="email" /></label>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Lokasi & catatan</h3>
            <label><span>Alamat</span><textarea name="addressText" rows={2} placeholder="Alamat pengiriman / lokasi customer" /></label>
            <label><span>Catatan</span><textarea name="notes" rows={3} placeholder="Preferensi ukuran, pembayaran, hari order, dll." /></label>
          </div>

          <div className="workspaceFormActions">
            <span>Customer menjadi account komersial, bukan entitas produksi.</span>
            <button className="workspacePrimaryButton" type="submit" disabled={databaseError}>Simpan Customer</button>
          </div>
        </form>

        <section className="workspaceCard recordWorkspaceCard">
          <div className="workspaceCardHeader">
            <div><span>ACCOUNTS</span><h2>Daftar customer</h2></div>
            <small>{customers.length} record</small>
          </div>

          <div className="recordTable customerRecordTable">
            <div className="recordTableHead">
              <span>Customer</span><span>Kontak</span><span>Tipe</span><span>Status</span>
            </div>
            {customers.length === 0 ? (
              <div className="recordEmpty">Belum ada customer.</div>
            ) : customers.map((customer) => (
              <article className="recordTableRow" key={customer.id}>
                <div><strong>{customer.name}</strong><small>{customer.contactPerson ?? "Contact person belum diisi"}</small></div>
                <div><strong>{customer.whatsapp ?? customer.phone ?? "—"}</strong><small>{customer.email ?? "Email belum diisi"}</small></div>
                <div><strong>{customer.customerType}</strong><small>Account komersial</small></div>
                <div><span className={`statusBadge ${customer.active ? "good" : "warning"}`}>{customer.active ? "ACTIVE" : "INACTIVE"}</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
