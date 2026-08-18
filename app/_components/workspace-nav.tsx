import Link from "next/link";

type BudidayaTab = "overview" | "input" | "sampling" | "harvest" | "expenses";
type SalesTab = "overview" | "leads" | "customers" | "orders" | "fulfillment";

type NavItem = {
  key: string;
  label: string;
  href?: string;
  hint?: string;
};

function WorkspaceTabs({
  active,
  items,
  ariaLabel,
}: {
  active: string;
  items: NavItem[];
  ariaLabel: string;
}) {
  return (
    <nav className="workspaceTabBar" aria-label={ariaLabel}>
      {items.map((item) =>
        item.href ? (
          <Link
            className={`workspaceTab ${active === item.key ? "active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <span>{item.label}</span>
            {item.hint ? <small>{item.hint}</small> : null}
          </Link>
        ) : (
          <span className="workspaceTab disabled" key={item.key} aria-disabled="true">
            <span>{item.label}</span>
            {item.hint ? <small>{item.hint}</small> : null}
          </span>
        ),
      )}
    </nav>
  );
}

export function BudidayaWorkspaceNav({ active }: { active: BudidayaTab }) {
  return (
    <WorkspaceTabs
      active={active}
      ariaLabel="Navigasi operasional budidaya"
      items={[
        { key: "overview", label: "Overview", href: "/budidaya" },
        { key: "input", label: "Input Harian", href: "/input" },
        { key: "sampling", label: "Sampling", href: "/sampling" },
        { key: "harvest", label: "Panen", href: "/harvest" },
        { key: "expenses", label: "Biaya", href: "/expenses" },
      ]}
    />
  );
}

export function SalesWorkspaceNav({ active }: { active: SalesTab }) {
  return (
    <>
      <WorkspaceTabs
        active={active}
        ariaLabel="Navigasi Sales CRM"
        items={[
          { key: "overview", label: "Overview", href: "/sales" },
          { key: "leads", label: "Leads", href: "/sales/leads" },
          { key: "customers", label: "Customers", href: "/sales/customers" },
          { key: "orders", label: "Orders", href: "/sales/orders" },
          { key: "fulfillment", label: "Fulfillment", href: "/sales/fulfillment" },
        ]}
      />
      <div className="workspaceFutureTabs" aria-label="Modul Sales CRM berikutnya">
        <span>Pipeline <small>next</small></span>
        <span>Delivery <small>next</small></span>
        <span>Invoice <small>next</small></span>
        <span>Payment <small>next</small></span>
      </div>
    </>
  );
}
