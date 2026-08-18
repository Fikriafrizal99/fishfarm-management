# FishFarm Management — Operational Design System

Status: **APPROVED REFERENCE**  
Applies from: V0.8 UI redesign

## Source of Truth

The approved redesign mockup showing these two screens is the visual source of truth:

1. Dashboard Farm
2. Pond Detail — KLM-001

Implementation should preserve the mockup's hierarchy and density rather than returning to the previous rounded-card SaaS style.

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

Primary font: **Inter** loaded through `next/font`.

Recommended scale:

| Role | Size | Weight |
|---|---:|---:|
| Page title | 25px | 700 |
| Section title | 13–14px | 700 |
| KPI value | 16–20px | 700 |
| Body | 11–14px | 400–500 |
| Label | 9–10px | 500–600 |
| Status badge | 9px | 700 |

Avoid widespread 800/850/900 weights.

## Shape System

Use only a small radius hierarchy:

- major operational surface: 8–11px
- controls: 6–7px
- status badges/avatar only: fully rounded

Do not use 20–28px card radii for normal workspace sections.

## Surface System

Main canvas:

- light neutral gray
- white operational surfaces
- border-first separation
- no decorative gradient hero

Default surface treatment:

```text
background: white
border: 1px solid light neutral line
shadow: none
radius: ~8px
```

## Color Roles

- Teal: brand, primary action, active navigation, primary chart line
- Green: healthy / ON TARGET
- Orange: monitor / warning / attention
- Red: action required / destructive states
- Gray: supporting copy, borders, target/reference chart line

Teal should not dominate the page background.

## Desktop App Chrome

### Dashboard

- 62px top bar
- 184px left sidebar
- Dashboard / Budidaya / Sales CRM / Alert / Lainnya navigation
- compact farm state summary at bottom of sidebar

### Pond Detail

- compact top bar
- sidebar collapsed/hidden to maximize operational working area
- back navigation to Budidaya

## Dashboard Composition

Order:

1. Dashboard Farm title + quick actions
2. four compact KPI summaries
3. Perlu Perhatian strip
4. Cycle Overview table
5. ABW growth chart + recent activity

Do not restore the previous large greeting hero.

## Pond Detail Composition

Order:

1. Pond title + status + quick actions
2. single KPI strip
3. grouped Populasi / Performa / Kolam data
4. ABW line chart
5. Aktivitas Terbaru / Biaya Berjalan / Alert & Catatan

Do not use horizontal progress bars for growth history.

## Growth Chart Rules

The approved mockup is the chart-layout reference, but the plotted values must remain data-honest.

- X-axis on pond detail follows observed sampling dates; a future harvest target must not stretch the chart domain and compress the observed points to the left.
- `Target ABW estimasi` is interpolated on the same observed sampling dates using the derived target average weight and target harvest date.
- A target/reference line is shown only when at least two sampling observations exist. One observation is a point, not a trend.
- Dashboard may show a dashed `Target (ABW)` reference for the primary cycle when the same derivation is available.
- Never invent intermediate biological targets solely to make the chart look like the mockup.

## Data Integrity Rule

Visual fidelity must never require fabricated operational values.

If the mockup contains a visual element that requires data not available in the domain model:

- derive it only when the derivation is legitimate and labeled,
- otherwise show the nearest truthful state.

Example: the chart may show `Target ABW estimasi` derived from target harvest biomass and current estimated population; it must not silently invent a biological target.

## Responsive Direction

Desktop follows the approved mockup closely.

On mobile:

- sidebar becomes bottom navigation,
- KPI rows collapse to 2 columns,
- quick actions scroll horizontally when needed,
- operational groups stack,
- wide tables/charts may scroll horizontally rather than shrinking into unreadability.

## Implementation Files

Current reference implementation:

- `app/_components/app-frame.tsx`
- `app/_components/icons.tsx`
- `app/_components/growth-chart.tsx`
- `app/page.tsx`
- `app/ponds/[pondCode]/page.tsx`
- `app/globals.css`
- `app/pixel-pass.css`

Remaining pages should reuse this visual system instead of introducing a second UI language.
