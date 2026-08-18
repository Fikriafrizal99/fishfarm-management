import Link from "next/link";
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  FarmIcon,
  FishMark,
  GridIcon,
  HomeIcon,
  MenuIcon,
  SalesIcon,
} from "./icons";

type ActiveNav = "dashboard" | "budidaya" | "sales" | "alert" | "lainnya";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function AppFrame({
  active,
  ownerName,
  alertCount = 0,
  activePonds,
  compact = false,
  children,
}: {
  active: ActiveNav;
  ownerName: string | null;
  alertCount?: number;
  activePonds?: number;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const firstName = ownerName?.split(" ")[0] ?? "Fikri";
  const initial = firstName.slice(0, 1).toUpperCase();
  const farmHealthy = alertCount === 0;

  return (
    <div className={`appFrame ${compact ? "compactFrame" : ""}`}>
      <header className="appTopbar">
        <div className="appBrand">
          {compact ? <Link className="compactMenu" href="/" aria-label="Kembali ke dashboard"><MenuIcon size={19} /></Link> : <FishMark size={24} />}
          <strong>FishFarm Management</strong>
        </div>
        <div className="topbarMeta">
          <span className="topbarDate"><CalendarIcon size={16} />{dateFormatter.format(new Date())}</span>
          <span className="topbarDivider" />
          <span className="notificationIcon"><BellIcon size={17} />{alertCount > 0 ? <b>{alertCount}</b> : null}</span>
          <div className="userMenu"><span className="avatar">{initial}</span><span>{firstName}</span><ChevronDownIcon size={14} /></div>
        </div>
      </header>

      {!compact ? (
        <aside className="appSidebar" aria-label="Navigasi utama">
          <nav className="sidebarNav">
            <Link className={`sidebarItem ${active === "dashboard" ? "active" : ""}`} href="/"><HomeIcon size={18} /><span>Dashboard</span></Link>
            <Link className={`sidebarItem ${active === "budidaya" ? "active" : ""}`} href="/"><FarmIcon size={18} /><span>Budidaya</span></Link>
            <Link className={`sidebarItem ${active === "sales" ? "active" : ""}`} href="/sales"><SalesIcon size={18} /><span>Sales CRM</span></Link>
            <a className={`sidebarItem ${active === "alert" ? "active" : ""}`} href="#attention"><BellIcon size={18} /><span>Alert</span>{alertCount > 0 ? <b className="navBadge">{alertCount}</b> : null}</a>
            <div className={`sidebarItem sidebarStatic ${active === "lainnya" ? "active" : ""}`}><GridIcon size={18} /><span>Lainnya</span><ChevronDownIcon size={14} /></div>
          </nav>

          {activePonds !== undefined ? (
            <div className="sidebarFarmState">
              <span>Budidaya</span>
              <strong className={farmHealthy ? "stateGood" : "stateMonitor"}><i />{farmHealthy ? "ON TARGET" : "MONITOR"}</strong>
              <hr />
              <b>{activePonds}</b>
              <small>Kolam Aktif</small>
            </div>
          ) : null}
        </aside>
      ) : null}

      <main className="appMain">{children}</main>
    </div>
  );
}
