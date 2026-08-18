# FishFarm Management — Operational Design System

Status: **FINAL SYSTEM REFERENCE**  
Applies from: V0.11 finalization

## Product Visual Language

FishFarm Management is an **operational aquaculture management system**, not a marketing dashboard.

Required characteristics:

- compact but readable
- data-first hierarchy
- neutral workspace canvas
- teal as accent, not wallpaper
- minimal shadow
- thin structural borders
- restrained font weights
- charts and tables for operational data
- few meaningful containers instead of nested cards
- clear status color semantics

## Typography

Primary font: **Inter** loaded through `next/font` and enforced on body, native controls, tables, and export-menu controls.

Final scale:

| Role | Size | Weight |
|---|---:|---:|
| Page title | 27px desktop / 24px compact | 700 |
| Section title | 15px | 700 |
| Card title | 14px | 700 |
| Body / subtitle | 12px | 400–500 |
| Form label | 10.5px | 500–600 |
| Metadata | 9.5px | 500–600 |
| Table header | 9–9.5px | 600 |
| Table body | 10.5–11px | 400–650 |
| Status badge | 9.5px | 700 |

Avoid widespread 800/850/900 weights and avoid introducing another font family.

`app/final-polish.css` is loaded **after all feature CSS** so feature modules cannot accidentally override the final typography scale.

## Shape System

- major operational surface: 8–11px
- controls: 6–7px
- status badges/avatar only: fully rounded

Do not use large decorative SaaS-card radii.

## Surface System

Default workspace surface:

```text
background: white
border: 1px solid light neutral line
shadow: none
radius: ~8px
```

Canvas remains light neutral gray. Decorative gradient heroes are not part of the application language.

## Color Roles

- Teal: brand, primary action, active navigation, primary chart line
- Green: healthy / ON TARGET / completed-positive state
- Orange: monitor / warning / outstanding attention
- Red: destructive / action required / cancelled
- Gray: supporting copy, borders, target/reference chart line

## Navigation Principle

The product uses only two primary navigation layers:

1. **Sidebar** — `Dashboard | Budidaya | Sales CRM | Lainnya`
2. **Workspace tabs** — submodules within the selected area

Alert Center is accessed through the topbar bell. The bell receives an active state on `/alerts`, so Alert does not need a duplicate sidebar item.

All normal desktop pages, including Pond Detail, use the same topbar + sidebar shell. Detail pages no longer switch to a separate compact application chrome.

### Budidaya tabs

```text
Overview | Kolam | Siklus | Input Harian | Sampling | Panen | Biaya
```

### Sales CRM tabs

```text
Overview | Leads | Customers | Pipeline | Orders | Fulfillment | Finance
```

Fulfillment contains Allocation + Delivery as internal workflow sections. Finance contains Invoice + Payment + Aging Piutang. Their database models remain separate.

### Utility tabs

```text
Riwayat | Laporan
```

`/more` redirects to `/history`.

## Form System

- forms are split into meaningful sections with divider lines
- desktop field height is 37px in the final scale
- submit actions sit in a compact footer
- unit/currency fields use integrated suffix/prefix controls
- supporting rules use small contextual notices
- native input/select/textarea controls must inherit Inter
- input forms select data context; they are not navigation shortcuts

## Table / Record System

- table headers use one shared 9–9.5px scale
- table bodies use 10.5–11px
- status always uses `statusBadge`; do not reintroduce legacy `badge` styles
- row actions are compact and visually secondary
- wide operational tables may scroll horizontally instead of shrinking text below readable size

## Dashboard

Composition:

1. page heading
2. four KPI summaries
3. attention strip
4. cycle overview table
5. ABW trend + recent activity

No greeting hero and no duplicate quick-action toolbar.

## Budidaya Overview

Shows farm-level current state and active cycles. Master-data creation belongs in `Kolam` and `Siklus`, not duplicated on Overview.

## Pond Detail

Composition:

1. pond/cycle title + status
2. KPI strip
3. grouped Populasi / Performa / Kolam
4. ABW sampling chart
5. Aktivitas / Biaya / Alert & Catatan
6. actual-final summary only when cycle is completed

Pond Detail uses the same sidebar shell as all other application pages.

## Growth Chart Rules

- X-axis follows observed sampling dates
- future harvest targets do not stretch the observed time domain
- `Target ABW estimasi` is interpolated on observed dates
- target line requires at least two observed points
- one observation is a point, not a trend
- zero values must render as zero-width/zero-height chart marks; never fabricate minimum bars that imply activity

## History Semantics

Active cycles show current operational state:

- SR
- FCR
- ABW
- estimated biomass
- running cost
- target harvest

They do **not** display running cost as final profit/loss.

Only completed cycles show:

- actual harvested kg
- Actual HPP
- revenue
- profit
- margin

## Report Semantics

Reports distinguish period activity from actual-final profitability.

- `Revenue − Biaya Periode` is a period cash/operational difference, not automatically final cycle profit
- `Margin Final` is shown only when a legitimate final margin exists
- zero revenue/harvest renders as zero, not a cosmetic minimum bar
- if no harvest occurred, the harvest chart shows an explicit empty state
- PDF/CSV export uses the same terminology as the on-screen report

## CRM Semantics

- Lead / Pipeline / Order use commercial demand data
- Fulfillment connects order demand to HarvestLot supply
- Delivery is physical hand-over
- Invoice is a billing snapshot
- Payment is cash collection
- aging is based on invoice due date
- implementation/version notes must never appear as operational cards in the production UI

## Responsive Direction

On narrower screens:

- workspace columns collapse to one column
- KPI grids collapse progressively
- workspace tabs scroll horizontally
- record tables remain horizontally scrollable when required
- typography may reduce page title to 24px but must not reduce operational text to unreadable micro sizes

## CSS Layer Order

Current load order:

1. `globals.css`
2. `pixel-pass.css`
3. `module-pass.css`
4. `workspace-v2.css`
5. `phase-ab.css`
6. `export-crm.css`
7. **`final-polish.css`** — authoritative final override

New feature CSS must not be imported after `final-polish.css` without revisiting this contract.

## Data Integrity Rule

Visual fidelity must never require fabricated operational values.

If an element requires data that does not exist:

- derive it only when legitimate and label it clearly,
- otherwise show a truthful empty/unavailable state.

Observed, estimated, projected, and actual-final values remain distinct.
