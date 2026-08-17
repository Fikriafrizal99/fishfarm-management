const pondRows = [
  {
    code: "KLM-001",
    species: "Nila",
    day: 64,
    sr: "94%",
    fcr: "1.14",
    status: "ON TARGET",
  },
  {
    code: "KLM-002",
    species: "Nila",
    day: 61,
    sr: "87%",
    fcr: "1.42",
    status: "NEEDS ATTENTION",
  },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">FishFarm Management</p>
        <h1>Halo, Fikri 👋</h1>
        <p>Fondasi aplikasi sudah aktif. Data pada layar ini masih contoh UI.</p>
      </header>

      <section className="metrics" aria-label="Ringkasan farm">
        <article><span>Kolam Aktif</span><strong>6</strong></article>
        <article><span>Ikan Aktif</span><strong>18.450</strong></article>
        <article><span>Estimasi Biomassa</span><strong>2.840 kg</strong></article>
        <article><span>Biaya Berjalan</span><strong>Rp18,7 jt</strong></article>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">KPI siklus</p>
            <h2>Ringkasan performa</h2>
          </div>
          <span className="badge good">SYSTEM SKELETON</span>
        </div>
        <div className="kpis">
          <div><span>Survival Rate</span><strong>94,2%</strong></div>
          <div><span>Mortalitas</span><strong>5,8%</strong></div>
          <div><span>FCR</span><strong>1,16</strong></div>
          <div><span>HPP Estimasi</span><strong>Rp15.420/kg</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panelTitle">
          <div>
            <p className="eyebrow dark">Status kolam</p>
            <h2>Cycle overview</h2>
          </div>
        </div>
        <div className="pondList">
          {pondRows.map((pond) => (
            <article className="pondRow" key={pond.code}>
              <div>
                <strong>{pond.code} — {pond.species}</strong>
                <span>Hari ke-{pond.day} · SR {pond.sr} · FCR {pond.fcr}</span>
              </div>
              <span className={`badge ${pond.status === "ON TARGET" ? "good" : "danger"}`}>
                {pond.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        V0.2 · Database schema + Next.js skeleton. Business data integration follows next.
      </footer>
    </main>
  );
}
