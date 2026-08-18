# FishFarm Management

Mobile-first aquaculture farm management system for operating fish-production cycles and managing the commercial pipeline from lead to payment.

## Vision

**record → measure → detect → decide → harvest → sell → deliver → collect → improve**

Production remains deterministic and explainable. Sales CRM is a separate commercial domain and does not redefine farming KPI formulas.

## Application Boundary — V0.10

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

          HISTORY / REPORTING
                 ↑
       read-only aggregation
       from source-of-truth data
```

Production and Sales remain **connected but loosely coupled**. CRM never needs a direct Pond or ProductionCycle reference. Commercial commitment happens only through:

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

## Production Management — V0.10

V0.10 removes the dependency on development seed data for day-to-day setup.

### Pond lifecycle

- create Pond
- edit name, type, dimensions, status, and notes
- delete only a truly empty Pond with no cycle/cost history
- a Pond with history is retained for auditability and can be made `INACTIVE` after its active cycle ends

### ProductionCycle lifecycle

Creating a cycle is atomic:

```text
ProductionCycle ACTIVE
      +
Stocking
      +
optional SEED Expense
```

A cycle can be edited while operational. Completed/cancelled cycles are read-only. A cycle with no Harvest can be cancelled; its existing raw logs remain as audit history. A cycle that already has Harvest must be closed through Final Harvest instead of cancellation.

Changes to active cycle targets/stocking trigger Decision Engine reevaluation.

## Operational Correction Policy

Raw operational records now have history views.

- Sampling — history + safe correction while cycle is ACTIVE/HARVESTING
- Feed — history + correction; linked feed Expense is recalculated
- Mortality — history + correction with population validation
- Manual Expense — ledger + correction while cycle is operational
- Harvest — history is read-only because a Harvest creates a HarvestLot and can already be referenced by commercial fulfillment

Completed/cancelled production records are not silently rewritten.

Observed, estimated, projected, and actual-final values remain distinct.

## Sales CRM Flow — V0.9+

```text
Lead
  ↓
Qualified Opportunity
  ↓
Sales Order
  ↓
HarvestLot allocation
  ↓
Fulfillment
  ↓
Delivery
  ↓
Invoice
  ↓
Payment
```

Behavior:

- creating an Opportunity from a Lead marks the Lead `QUALIFIED`
- converting an OPEN Opportunity into a Sales Order marks the Opportunity `WON` and originating Lead `CONVERTED`
- Fulfillment reserves harvested stock without directly binding CRM records to ponds
- Sales Order becomes `PARTIALLY_FULFILLED` when fulfillment starts
- only actually `DELIVERED` quantity can complete the Sales Order
- Invoice stores a billing snapshot
- Payment updates Invoice to `PARTIALLY_PAID` / `PAID`

## Navigation Principle

Navigation is intentionally limited to two layers:

1. **Sidebar** — major areas: Dashboard, Budidaya, Sales CRM, Lainnya.
2. **Workspace tabs** — submodules inside the selected area.

Header cards/context rails should not repeat links already available in those layers. Transaction selectors such as `Kolam / Siklus` remain because they choose data context rather than navigation.

### Budidaya tabs

```text
Overview | Kolam | Siklus | Input Harian | Sampling | Panen | Biaya
```

### Utility tabs

```text
Riwayat | Laporan
```

`/more` redirects directly to `/history`; the redundant Utility Overview page was removed.

## Implemented Routes

### Main / Production

- `/` — farm dashboard
- `/budidaya` — production overview
- `/ponds` — Pond create/edit/safe-delete workspace
- `/cycles` — ProductionCycle create/edit/cancel/read-only lifecycle
- `/input` — daily feed/mortality input + raw-log history/correction
- `/sampling` — sampling input + observed history/correction
- `/harvest` — partial/final harvest + immutable harvest history
- `/expenses` — manual operating cost input + editable ledger
- `/ponds/[pondCode]` — pond/cycle operational detail
- `/alerts` — Decision Engine alert center
- `/history` — production + commercial history
- `/reports` — period-aware business performance
- `/more` — redirects to `/history`
- `/api/health/db` — PostgreSQL health check

### Sales CRM

- `/sales`
- `/sales/leads`
- `/sales/customers`
- `/sales/pipeline`
- `/sales/orders`
- `/sales/fulfillment`
- `/sales/deliveries`
- `/sales/invoices`
- `/sales/payments`

## History — V0.10

Production history is intentionally separated by data maturity.

### Siklus Berjalan

Shows current operational state:

- SR
- FCR
- ABW
- estimated biomass
- running cost
- target harvest date

It **does not** label current cost as final loss/profit.

### Siklus Selesai

Only `COMPLETED` cycles show actual-final financial outputs:

- actual harvested kg
- Actual HPP/kg
- actual revenue
- net profit
- margin

### Commercial ledger

Order history reconciles:

```text
Order → Delivered → Invoice → Paid → Outstanding
```

The History page supports date range filtering for completed cycles and commercial orders. Active cycles remain visible as a current snapshot.

## Reports — V0.10

Reports are read-only aggregations from the same PostgreSQL source of truth; they create no duplicate accounting ledger.

### Executive KPIs

- total harvest in period
- production cost in period
- order value in period
- collected cash in period

### Production analytics

- active vs completed cycle counts
- period revenue/cost/net result
- monthly revenue vs cost trend
- monthly harvest kg
- current active-cycle comparison for SR, FCR, ABW, biomass, cost, and status

### Commercial analytics

- current OPEN pipeline
- current receivables
- period orders/delivery/invoice/payment
- monthly order vs collection trend
- customer contribution

Reports support `from` / `to` date filters.

## HarvestLot Behavior

Every new Harvest creates a sellable `HarvestLot` in the same transaction.

```text
Harvest KLM-001 = 800 kg
        ↓
HarvestLot HL-KLM-001-... = 800 kg
        ↓
Fulfillment allocation(s)
```

Available inventory is derived:

```text
available kg = harvest lot kg - active allocation kg
```

## Authentication / Authorization Direction

Authentication remains intentionally **deferred** while the application is personal/single-user.

The schema foundation is retained:

```text
User
  ↓
FarmMembership
  ↓
FarmRole
```

The existing `OWNER / MANAGER / OPERATOR / VIEWER` structure should not be removed. Auth and server permission enforcement can be added later without redesigning production or CRM entities.

## Export Status

CSV/PDF export is **not part of V0.10 Phase A+B**. It remains the next dedicated Export phase so that download formats are built on top of the now-stable CRUD/history/report structures rather than duplicated early.

Planned:

- CSV raw/history exports
- PDF Farm Report
- PDF Cycle Report
- PDF Invoice

## Product Principles

- PostgreSQL is the source of truth, not spreadsheets
- observed, estimated, projected, and actual-final values remain distinct
- production KPIs trace back to raw production records
- corrections are constrained by lifecycle state
- completed-cycle outputs are auditable
- HarvestLot/Fulfillment is the production-to-sales bridge
- Invoice is a billing snapshot
- Payment is the cash-collection source of truth
- reporting reads source-of-truth transactions instead of creating a second ledger
- AI remains a later interpretation layer

## Development

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

## Validation Status

The V0.8 production/database baseline previously passed local bootstrap, Prisma generation, constraints/seed, Decision Engine evaluation, TypeScript, production build, DB health, and UI sanity checks.

**V0.9 CRM + V0.10 Phase A/B are implemented and require a fresh local validation gate.**

No Prisma schema change was required for V0.10, so database reset/bootstrap is not required.

```powershell
git pull
npm run typecheck
npm run build
npm run dev
```

Validate:

```text
Pond create → edit → safe delete empty pond
Pond create → start cycle → pond deletion blocked
Cycle create → edit targets/stocking → cancel before harvest
Input/Sampling/Expense → history → correction
Completed/cancelled records → locked
Harvest → immutable history
History → active vs completed semantics
Reports → period filter + trends + cycle comparison
CRM V0.9 end-to-end flow
```

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
- **Architecture:** modular monolith

## Status

**Version:** 0.10.0  
**Phase:** Core Usability + History/Reporting  
**Production core:** validated V0.8 baseline, V0.10 extension pending local validation  
**CRM:** V0.9 implemented, local runtime validation pending  
**Auth:** deferred  
**Export:** next phase
