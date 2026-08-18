# Product Roadmap — FishFarm Management

Version: **0.11**

## Current State

The V0.8 production/database foundation passed local bootstrap, seed, Decision Engine, TypeScript, production build, DB health, and UI sanity checks.

V0.9 implements the first end-to-end Sales CRM transaction flow. V0.10 adds Pond/Cycle management, safe operational corrections, lifecycle-aware History, and period-aware Reports. V0.11 adds export/documents plus CRM workspace consolidation, customer purchase history, and receivable aging.

V0.9–V0.11 changes still require a fresh local validation gate before being called runtime-stable.

## Phase 0 — Product & Architecture Foundation

Status: **SUBSTANTIALLY COMPLETE**

- [x] product vision
- [x] PRD baseline
- [x] system architecture
- [x] production domain model
- [x] Sales CRM domain model
- [x] KPI/formula model
- [x] Decision Engine model
- [x] production ↔ sales integration boundary
- [x] operational design system
- [ ] consolidated API/use-case contract document
- [ ] formal automated test strategy

## Phase 1 — Development Platform

Status: **VALIDATED BASELINE**

- [x] Next.js + TypeScript
- [x] PostgreSQL 17
- [x] Prisma 7
- [x] Docker Compose local database
- [x] deterministic seed chain
- [x] PostgreSQL constraints
- [x] database bootstrap
- [x] PWA manifest baseline
- [ ] authentication — **deferred while product is personal/single-user**
- [ ] production deployment

`User`, `FarmMembership`, and `FarmRole` remain in the schema for future authentication/authorization.

## Phase 2 — Production Core

Status: **IMPLEMENTED / BASELINE VALIDATED**

- [x] Farm / Pond / ProductionCycle schema
- [x] daily feed / mortality / expense input
- [x] sampling input
- [x] ABW / biomass / SR / mortality / FCR / ADG
- [x] pond detail and growth chart
- [x] partial/final harvest
- [x] HarvestLot auto-creation
- [x] Actual HPP / profit / margin / Final FCR
- [x] Pond create/edit/safe-delete management
- [x] ProductionCycle create/edit/cancel/read-only lifecycle
- [ ] Farm settings CRUD
- [ ] projected HPP/margin/BEP engine UI

## Phase 3 — Decision Engine

Status: **IMPLEMENTED V1 / BASELINE VALIDATED**

- [x] sampling-stale rule
- [x] initial-biomass missing rule
- [x] FCR target rule
- [x] SR target rule
- [x] harvest-date-near rule
- [x] alert open/update/resolve lifecycle
- [x] Dashboard status from alert severity
- [x] Alert Center read UI
- [x] cycle target/raw correction triggers reevaluation
- [x] cancellation resolves active cycle alerts
- [ ] acknowledge alert action
- [ ] configurable rule UI
- [ ] mortality daily/trend rule
- [ ] finance-margin rules

## Phase 4 — Sales CRM Foundation — V0.8

Status: **COMPLETE**

- [x] Customer / Lead / Opportunity / Interaction schema
- [x] SalesOrder / SalesOrderItem
- [x] HarvestLot / FulfillmentAllocation
- [x] Delivery / Invoice / Payment schema
- [x] Sales Dashboard
- [x] Lead / Customer / Order / Fulfillment UI
- [x] deterministic CRM seed + constraints

## Phase 5 — End-to-End CRM Flow — V0.9

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

- [x] Pipeline workspace and Lead → Opportunity
- [x] Opportunity → Sales Order conversion
- [x] OPEN → WON and Lead → CONVERTED lifecycle
- [x] fulfillment allocation balance validation
- [x] Delivery PLANNED → DISPATCHED → DELIVERED
- [x] delivered quantity controls Sales Order completion
- [x] Invoice issuance / uninvoiced balance / VOID guard
- [x] Payment DP / partial / final + overpayment protection
- [x] receivable and monthly collection from Payment source of truth

## Phase 6 — Core Usability — V0.10 / Phase A

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

### Master data

- [x] Budidaya tab `Kolam`
- [x] create/edit Pond
- [x] safe delete only for truly empty Pond
- [x] historical Pond retained instead of destructive delete
- [x] Budidaya tab `Siklus`
- [x] atomic ProductionCycle + Stocking + optional SEED Expense creation
- [x] edit cycle targets and initial stocking while operational
- [x] completed/cancelled Cycle read-only
- [x] safe cycle cancellation before Harvest

### Operational history & correction

- [x] Sampling history + correction
- [x] Feed history + linked feed-cost correction
- [x] Mortality history + population-safe correction
- [x] Manual Expense ledger + correction
- [x] completed/cancelled operational logs locked
- [x] Harvest history locked because of HarvestLot/commercial references

## Phase 7 — History & Reporting — V0.10 / Phase B

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

- [x] Utility navigation reduced to `Riwayat | Laporan`
- [x] active and completed production cycles separated
- [x] active cycles show operational state instead of fake final loss
- [x] completed cycles show Actual HPP/revenue/profit/margin
- [x] commercial Order → Delivered → Invoice → Paid → Outstanding reconciliation
- [x] History date filter
- [x] Reports date filter
- [x] executive KPI hierarchy
- [x] production revenue vs cost trend
- [x] harvest kg visualization
- [x] active-cycle comparison
- [x] Order vs Collection trend
- [x] pipeline / receivable snapshot
- [x] customer contribution

## Phase 8 — Export / Documents — V0.11

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

### CSV

- [x] unified History CSV with date-range support
- [x] Reports CSV with date-range support
- [x] Sampling raw CSV
- [x] Expense ledger CSV
- [x] Sales Orders CSV
- [x] Payments CSV
- [x] UTF-8 BOM and CSV escaping

### PDF

- [x] reusable server-side PDF document generator
- [x] Farm Report PDF
- [x] Production Cycle PDF
- [x] Invoice PDF
- [x] active cycle PDF keeps estimated/running values separate from actual-final
- [x] completed cycle PDF uses final harvested biomass for Final FCR
- [x] Invoice PDF labels Sales Order items as references when invoice subtotal is partial

### UI

- [x] one compact `Export` menu instead of duplicated download buttons
- [x] Reports CSV/PDF actions
- [x] History CSV action
- [x] Sampling / Expense / Orders / Payments CSV actions
- [x] Cycle PDF row action
- [x] Invoice PDF row action

## Phase 9 — CRM Usability & Control — V0.11 / CRM Polish

Status: **PARTIALLY COMPLETE / LOCAL VALIDATION PENDING**

### Completed in V0.11

- [x] Sales navigation shortened to `Overview | Leads | Customers | Pipeline | Orders | Fulfillment | Finance`
- [x] Fulfillment workspace combines Allocation + Delivery UI
- [x] Delivery remains a separate database transaction/domain model
- [x] Finance workspace combines Invoice + Payment UI
- [x] Invoice and Payment remain separate ledgers/domain models
- [x] receivable aging: current / 1–30 / 31–60 / >60 days
- [x] aging based on Asia/Jakarta calendar day
- [x] customer purchase history detail
- [x] customer ordered kg/value and ASP/kg
- [x] customer delivered / invoiced / collected / outstanding summary
- [x] backward-compatible Delivery/Invoice/Payment routes redirect to canonical workspaces

### Remaining CRM usability

- [ ] CustomerInteraction write timeline
- [ ] follow-up update/reminder workflow
- [ ] multi-item Sales Order UI
- [ ] order cancellation workflow
- [ ] customer margin contribution
- [ ] repeat-order metrics
- [ ] delivery proof / attachments
- [ ] quotation workflow
- [ ] returns / claims

## V0.11 Validation Gate

Because V0.11 adds `pdf-lib` but does not change Prisma schema:

```powershell
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

Do **not** reset or reseed the database merely for V0.11.

Runtime sanity paths:

```text
/reports
/history
/sampling
/expenses
/cycles
/sales/orders
/sales/customers
/sales/fulfillment
/sales/finance
```

Download sanity checks:

```text
History CSV
Report CSV
Report PDF
Sampling CSV
Expense CSV
Order CSV
Payment CSV
Cycle PDF
Invoice PDF
```

## V1.0 Release Definition

```text
Pond / Cycle Management
    ↓
Daily Operations + Sampling
    ↓
KPI + Alerts
    ↓
Harvest → HarvestLot
    ↓
Lead / Opportunity / Sales Order
    ↓
Fulfillment (Allocation + Delivery)
    ↓
Finance (Invoice + Payment)
    ↓
History + Performance Report + Export
```

Core operation must not require spreadsheets.

## Post-MVP Candidates

- water-quality logs (pH / DO / temperature)
- feed inventory and procurement
- supplier management
- Telegram alerts
- PWA offline drafts/sync
- multi-user authorization
- attachments/photos
- WhatsApp CRM integration
- demand vs projected harvest capacity

## Data-Maturity Candidates

Only after enough clean real data exists:

- multi-farm organization
- biological benchmarking
- AI daily farm summary
- AI commercial summary
- anomaly detection
- predictive harvest date
- demand forecasting
- feed planning recommendations
- IoT ingestion

AI/ML remains an interpretation layer, not a replacement for production formulas, inventory allocation, billing, or payments.
