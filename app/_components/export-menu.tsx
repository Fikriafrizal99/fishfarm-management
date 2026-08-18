export type ExportMenuItem = {
  label: string;
  href: string;
};

export function ExportMenu({ items, label = "Export" }: { items: ExportMenuItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <details className="exportMenu">
      <summary>{label} <span aria-hidden="true">⌄</span></summary>
      <div className="exportMenuPopover">
        {items.map((item) => (
          <a href={item.href} key={`${item.label}-${item.href}`}>{item.label}</a>
        ))}
      </div>
    </details>
  );
}
