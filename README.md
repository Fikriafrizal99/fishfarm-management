# FishFarm Management

Mobile-first aquaculture farm management system for operating fish-production cycles and managing the commercial pipeline from lead to payment.

## Vision

**record → measure → detect → decide → harvest → sell → deliver → collect → improve**

Production remains deterministic and explainable. Sales CRM is a separate commercial domain and does not redefine farming KPI formulas.

## Application Boundary — V0.11

```text
BUDIDAYA / PRODUCTION                 SALES CRM

Pond                                  Lead
  ↓                                     ↓
ProductionCycle                       Customer
  ↓                                     ↓
Daily Input / Sampling                Opportunity
  ↓                                     ↓
KPI + Decision Engine                 SalesOrder
  ↓                                     ↓
Harvest                               SalesOrderItem
  ↓                                     ↓
HarvestLot        ← bridge →      FulfillmentAllocation
                                         ↓
                                      Delivery
                                         ↓
                                      Invoice
                                         ↓
                                      Payment

          HISTORY / REPORTING / EXPORT
                 ↑
       read-only aggregation
       from source-of-truth data
```

Production and Sales remain **connected but loosely coupled**. CRM never needs a direct Pond or ProductionCycle reference. Commercial commitment happens only through:

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

## Production Management — V0.10+

### Pond lifecycle

- create Pond,
- edit name, type, dimensions, status, and notes,
- delete only a truly empty Pond with no cycle/cost history,
- historical Pond remains auditable and can become `INACTIVE` after its active cycle ends.

### ProductionCycle lifecycle

Creating a cycle is atomic:

```text
ProductionCycle ACTIVE
      +
Stocking
      +
optional SEED Expense
```

A cycle can be edited while operational. Completed/cancelled cycles are read-only. A cycle with no Harvest can be cancelled. A cycle that already has Harvest must close through Final Harvest.

Changes to active cycle targets/stocking trigger Decision Engine reevaluation.

## Operational Correction Policy

- Sampling — history + safe correction while cycle is ACTIVE/HARVESTING,
- Feed — history + correction; linked feed Expense is recalculated,
- Mortality — history + correction with population validation,
- Manual Expense — ledger + correction while cycle is operational,
- Harvest — history is read-only because Harvest creates HarvestLot and may already be referenced by commercial fulfillment.

Completed/cancelled production records are not silently rewritten.

Observed, estimated, projected, and actual-final values remain distinct.

## Sales CRM — V0.11

Underlying transaction flow remains:

```text
Lead
  ↓
Opportunity
  ↓
Sales Order
  ↓
FulfillmentAllocation ↔ HarvestLot
  ↓
Delivery
  ↓
Invoice
  ↓
Payment
```

The visible workspace is intentionally shorter:

```text
Overview | Leads | Customers | Pipeline | Orders | Fulfillment | Finance
```

UI consolidation does **not** collapse domain records:

```text
Fulfillment
├── Allocation
└── Delivery

Finance
├── Aging Piutang
├── Invoice
└── Payment
```

Rules remain unchanged:

- Lead used for Opportunity becomes `QUALIFIED`,
- converting OPEN Opportunity to Sales Order makes Opportunity `WON` and originating Lead `CONVERTED`,
- Allocation reserves harvested stock but does not mean delivered,
- only `DELIVERED` quantity can complete Sales Order fulfillment,
- Invoice is a billing snapshot,
- Payment is the cash-collection source of truth,
- payment cannot exceed invoice outstanding balance.

Legacy routes remain compatible through redirects:

```text
/sales/deliveries → /sales/fulfillment#delivery
/sales/invoices   → /sales/finance#invoice
/sales/payments   → /sales/finance#payment
```

## Customer Commercial History — V0.11

Selecting a customer from `/sales/customers` shows:

- total orders,
- ordered kg,
- order value,
- average selling price per kg,
- delivered kg,
- invoiced amount,
- collected amount,
- outstanding receivable,
- last order date,
- Sales Order purchase history,
- OPEN Opportunity count.

These metrics are calculated from the existing CRM transactions; no duplicate customer ledger is created.

## Receivable Aging — V0.11

`/sales/finance` derives active receivables into:

```text
Belum jatuh tempo
1–30 hari
31–60 hari
>60 hari
```

The bucket boundary uses the Asia/Jakarta calendar day. An invoice due today remains current until the next calendar day.

## Navigation Principle

Navigation is intentionally limited to two visible layers:

1. **Sidebar** — Dashboard, Budidaya, Sales CRM, Lainnya.
2. **Workspace tabs** — submodules inside the selected area.

Header cards/context rails should not repeat links already available in those layers. Transaction selectors such as `Kolam / Siklus` remain because they choose data context rather than navigation.

### Budidaya

```text
Overview | Kolam | Siklus | Input Harian | Sampling | Panen | Biaya
```

### Sales CRM

```text
Overview | Leads | Customers | Pipeline | Orders | Fulfillment | Finance
```

### Utility

```text
Riwayat | Laporan
```

`/more` redirects to `/history`.

## History & Reports

### History

Active cycles show current operational state only:

- SR,
- FCR,
- ABW,
- estimated biomass,
- running cost,
- target harvest date.

Only `COMPLETED` cycles show actual-final:

- harvested kg,
- Actual HPP/kg,
- actual revenue,
- profit,
- margin.

Commercial history reconciles:

```text
Order → Delivered → Invoice → Paid → Outstanding
```

### Reports

Reports remain read-only aggregations from PostgreSQL:

- period harvest and production cost,
- production revenue/net result,
- monthly revenue vs cost,
- monthly harvest kg,
- active-cycle SR/FCR/ABW/biomass/cost comparison,
- current pipeline and receivables,
- order vs collection trend,
- customer contribution.

Both History and Reports support date-range filtering.

## Export & Documents — V0.11

Exports are generated server-side from PostgreSQL source-of-truth data.

### CSV

- History CSV,
- Report CSV,
- Sampling CSV,
- Expense ledger CSV,
- Sales Orders CSV,
- Payments CSV.

### PDF

- Farm Report PDF,
- Production Cycle PDF,
- Invoice PDF.

Cycle PDF respects lifecycle semantics:

- active cycle → observed/estimated/running values,
- completed cycle → final harvested-biomass FCR, Actual HPP, profit, and margin.

Invoice PDF treats Sales Order items as **references** because the current Invoice model is a billing snapshot and may represent partial billing.

The UI uses one compact `Export` menu instead of multiple competing download buttons.

## Implemented Routes

### Main / Production

- `/` — farm dashboard
- `/budidaya` — production overview
- `/ponds` — Pond management
- `/cycles` — ProductionCycle management
- `/input` — daily feed/mortality history + correction
- `/sampling` — sampling history + correction
- `/harvest` — partial/final harvest + immutable history
- `/expenses` — manual operating cost ledger
- `/ponds/[pondCode]` — operational detail
- `/alerts` — Decision Engine alerts
- `/history` — production + commercial history
- `/reports` — business performance
- `/more` — redirects to `/history`
- `/api/health/db` — PostgreSQL health check

### Sales CRM

- `/sales`
- `/sales/leads`
- `/sales/customers`
- `/sales/pipeline`
- `/sales/orders`
- `/sales/fulfillment` — Allocation + Delivery
- `/sales/finance` — Aging + Invoice + Payment

### Export API

- `/api/export/history`
- `/api/export/reports/csv`
- `/api/export/reports/pdf`
- `/api/export/data/sampling`
- `/api/export/data/expenses`
- `/api/export/data/orders`
- `/api/export/data/payments`
- `/api/export/cycles/[cycleId]/pdf`
- `/api/export/invoices/[invoiceId]/pdf`

## Authentication / Authorization Direction

Authentication remains intentionally **deferred** while the application is personal/single-user.

The schema foundation remains:

```text
User
  ↓
FarmMembership
  ↓
FarmRole
```

The existing `OWNER / MANAGER / OPERATOR / VIEWER` foundation should not be removed. Auth can be added later without redesigning production or CRM entities.

## Product Principles

- PostgreSQL is the source of truth, not spreadsheets,
- observed, estimated, projected, and actual-final values remain distinct,
- production KPIs trace back to raw production records,
- corrections are constrained by lifecycle state,
- completed-cycle outputs are auditable,
- HarvestLot/Fulfillment is the production-to-sales bridge,
- Delivery remains proof of physical hand-over,
- Invoice remains a billing snapshot,
- Payment remains the cash-collection source of truth,
- reporting/export reads source-of-truth transactions instead of creating a second ledger,
- AI remains a later interpretation layer.

## Development

Initial development setup:

```powershell
Copy-Item .env.example .env
npm install
npm run db:bootstrap
npm run dev
```

Useful commands:

```powershell
npm run db:seed
npm run prisma:studio
npm run decision:evaluate
npm run typecheck
npm run build
```

## V0.11 Validation Gate

The V0.8 production/database baseline previously passed local validation. V0.9–V0.11 extensions now require a fresh validation pass.

V0.11 adds `pdf-lib` but **does not change Prisma schema**, so install dependencies but do not reset the database:

```powershell
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

Validate pages:

```text
/ponds
/cycles
/input
/sampling
/expenses
/history
/reports
/sales/customers
/sales/orders
/sales/fulfillment
/sales/finance
```

Validate downloads:

```text
History CSV
Report CSV
Report PDF
Sampling CSV
Expense CSV
Sales Orders CSV
Payments CSV
Cycle PDF
Invoice PDF
```

Do not call V0.11 runtime-stable until TypeScript, production build, local write flow, and export download tests pass.

## Documentation

- [`docs/PRD.md`](docs/PRD.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md)
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md)
- [`docs/KPI_MODEL.md`](docs/KPI_MODEL.md)
- [`docs/DECISION_ENGINE.md`](docs/DECISION_ENGINE.md)
- [`docs/SALES_CRM.md`](docs/SALES_CRM.md)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Technical Baseline

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Backend:** Next.js server-side application/service layer
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **PDF:** pdf-lib
- **Architecture:** modular monolith

## Status

**Version:** 0.11.0  
**Phase:** Export/Documents + CRM Polish  
**Production core:** validated V0.8 baseline, V0.10 extension pending fresh local validation  
**CRM:** end-to-end implemented; V0.11 workspace polish pending local validation  
**Export:** implemented; local PDF/CSV validation pending  
**Auth:** deferred
