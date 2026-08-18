import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FishMark({ size = 30, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 42 30" width={size * 1.4} height={size} aria-hidden="true" {...props}>
      <path d="M5 15c7-8 18-11 28-5l5-5v20l-5-5c-10 6-21 3-28-5Z" fill="currentColor" opacity=".14" />
      <path d="M5 15c7-8 18-11 28-5l5-5v20l-5-5c-10 6-21 3-28-5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" />
      <path d="M8 19c7 2 14 1 20-3M4 8c4 1 7 0 10-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 11 9-7 9 7" /><path d="M5.5 10v10h13V10" /><path d="M9 20v-6h6v6" /></IconBase>;
}

export function FarmIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 20h16" /><path d="M6 20v-8l6-4 6 4v8" /><path d="M9 20v-5h6v5" /><path d="M8 8c0-2 1.5-4 4-5 2.5 1 4 3 4 5" /></IconBase>;
}

export function SalesIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5M8 17h3" /><path d="m16 14 2 2 3-4" /></IconBase>;
}

export function BellIcon(props: IconProps) {
  return <IconBase {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></IconBase>;
}

export function GridIcon(props: IconProps) {
  return <IconBase {...props}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></IconBase>;
}

export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></IconBase>;
}

export function SamplingIcon(props: IconProps) {
  return <IconBase {...props}><path d="m14 4 6 6" /><path d="M12 6 4.5 13.5a3.5 3.5 0 0 0 5 5L17 11" /><path d="M8 15h5" /></IconBase>;
}

export function InputIcon(props: IconProps) {
  return <IconBase {...props}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /><path d="m15 16 2 2 3-3" /></IconBase>;
}

export function HarvestIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 19c5-6 9-9 16-14" /><path d="M8 16c-3-1-4-3-4-6 3 0 5 1 6 4M13 11c-1-3 0-5 3-7 2 2 2 4 1 6M12 13c3 0 5 1 7 4-3 2-6 2-8 0" /></IconBase>;
}

export function CostIcon(props: IconProps) {
  return <IconBase {...props}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /><circle cx="16" cy="16" r="2" /></IconBase>;
}

export function AlertTriangleIcon(props: IconProps) {
  return <IconBase {...props}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></IconBase>;
}

export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m7 10 5 5 5-5" /></IconBase>;
}

export function ChevronRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 6 6 6-6 6" /></IconBase>;
}

export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16" /></IconBase>;
}

export function MoreIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></IconBase>;
}
