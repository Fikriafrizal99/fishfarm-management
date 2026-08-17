import Link from "next/link";
import { getSalesCustomers } from "@/src/application/sales/get-sales-lists";
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

  return (
    <main className="shell salesShell">
      <div className="topBar">
        <Link className="backLink" href="/sales">← Sales Dashboard</Link>
        <span className="badge good">CUSTOMERS</span>
      </div>

      <header className="pageHeader">
        <p className="eyebrow dark">Sales CRM</p>
        <h1>Customer</h1>
        <p>Database pembeli disimpan terpisah dari kolam dan siklus. Riwayat order akan menempel ke customer ini.</p>
      </header>

      {params.saved === "1" ? <div className="notice successNotice">Customer berhasil disimpan.</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {databaseError ? <div className="notice errorNotice">Database belum tersambung.</div> : null}

      <section className="twoColumn salesWorkspace">
        <form action={submitCustomer} className="panel inputForm">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">New Customer</p>
              <h2>Tambah pembeli</h2>
            </div>
          </div>

          <label>
            <span>Nama customer</span>
            <input name="name" required placeholder="RM Sederhana Cianjur" />
          </label>

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

          <div className="formGrid">
            <label>
              <span>Contact person</span>
              <input name="contactPerson" placeholder="Pak/Bu..." />
            </label>
            <label>
              <span>WhatsApp</span>
              <input name="whatsapp" inputMode="tel" placeholder="08..." />
            </label>
          </div>

          <div className="formGrid">
            <label>
              <span>Telepon</span>
              <input name="phone" inputMode="tel" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" />
            </label>
          </div>

          <label>
            <span>Alamat</span>
            <textarea name="addressText" rows={2} placeholder="Alamat pengiriman / lokasi customer" />
          </label>

          <label>
            <span>Catatan</span>
            <textarea name="notes" rows={3} placeholder="Preferensi ukuran, pembayaran, hari order, dll." />
          </label>

          <button className="primaryButton" type="submit" disabled={databaseError}>Simpan Customer</button>
        </form>

        <section className="panel">
          <div className="panelTitle">
            <div>
              <p className="eyebrow dark">Accounts</p>
              <h2>Daftar customer</h2>
            </div>
            <span>{customers.length}</span>
          </div>

          <div className="crmList">
            {customers.length === 0 ? <div className="emptyInline">Belum ada customer.</div> : customers.map((customer) => (
              <div className="crmRow" key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.customerType}{customer.contactPerson ? ` · ${customer.contactPerson}` : ""}</span>
                  {customer.whatsapp ? <span>WA {customer.whatsapp}</span> : null}
                </div>
                <div className="crmRowRight">
                  <span className={`badge ${customer.active ? "good" : "warning"}`}>{customer.active ? "ACTIVE" : "INACTIVE"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <footer>Sales CRM · Customer menjadi account komersial, bukan entitas produksi.</footer>
    </main>
  );
}
