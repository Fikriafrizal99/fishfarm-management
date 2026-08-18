import Link from "next/link";
import {
  BellIcon,
  CalendarIcon,
  FarmIcon,
  FishMark,
  GridIcon,
  HomeIcon,
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
  showFarmState = false,
  children,
}: {
  active: ActiveNav;
  ownerName: string | null;
  alertCount?: number;
  activePonds?: number;
  compact?: boolean;
  showFarmState?: boolean;
  children: React.ReactNode;
}) {
  const firstName = ownerName?.split(" ")[0] ?? "Fikri";
  const initial = firstName.slice(0, 1).toUpperCase();
  const farmHealthy = alertCount === 0;

  return (
    <div className={`appFrame ${compact ? "appFrameUnified" : ""}`}>
      <header className="appTopbar">
        <div className="appBrand">
          <FishMark size={24} />
          <strong>FishFarm Management</strong>
        </div>
        <div className="topbarMeta">
          <span className="topbarDate"><CalendarIcon size={16} />{dateFormatter.format(new Date())}</span>
          <span className="topbarDivider" />
          <Link className="notificationIcon" href="/alerts" aria-label="Buka pusat alert">
            <BellIcon size={17} />{alertCount > 0 ? <b>{alertCount}</b> : null}
          </Link>
          <div className="userMenu" aria-label={`Pengguna: ${firstName}`}><span className="avatar">{initial}</span><span>{firstName}</span></div>
        </div>
      </header>

      <aside className="appSidebar" aria-label="Navigasi utama">
        <nav className="sidebarNav">
          <Link className={`sidebarItem ${active === "dashboard" ? "active" : ""}`} href="/"><HomeIcon size={18} /><span>Dashboard</span></Link>
          <Link className={`sidebarItem ${active === "budidaya" ? "active" : ""}`} href="/budidaya"><FarmIcon size={18} /><span>Budidaya</span></Link>
          <Link className={`sidebarItem ${active === "sales" ? "active" : ""}`} href="/sales"><SalesIcon size={18} /><span>Sales CRM</span></Link>
          <Link className={`sidebarItem ${active === "lainnya" ? "active" : ""}`} href="/more"><GridIcon size={18} /><span>Lainnya</span></Link>
        </nav>

        {showFarmState && activePonds !== undefined ? (
          <Link className="sidebarFarmState sidebarFarmStateLink" href="/budidaya">
            <span>Budidaya</span>
            <strong className={farmHealthy ? "stateGood" : "stateMonitor"}><i />{farmHealthy ? "ON TARGET" : "MONITOR"}</strong>
            <hr />
            <b>{activePonds}</b>
            <small>Kolam Aktif</small>
          </Link>
        ) : null}
      </aside>

      <main className="appMain">{children}</main>
    </div>
  );
}
