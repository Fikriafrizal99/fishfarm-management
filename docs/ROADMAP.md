# Product Roadmap — FishFarm Management

Version: **0.10**

## Current State

The V0.8 production/database foundation has passed local bootstrap, seed, Decision Engine, TypeScript, production build, DB health, and UI sanity checks.

V0.9 implements the first end-to-end Sales CRM transaction flow. V0.10 adds the missing personal-operations usability layer: Pond/Cycle management, safe raw-log corrections, lifecycle-aware History, and period-aware Reports. V0.9/V0.10 require fresh local runtime validation.

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

- [x] Customer / Lead / Opportunity / Interaction
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
- [x] create Pond
- [x] edit Pond dimensions/type/status/notes
- [x] safe delete only for truly empty Pond
- [x] historical Pond retained instead of destructive delete
- [x] Budidaya tab `Siklus`
- [x] create ACTIVE ProductionCycle
- [x] atomic Stocking + optional SEED Expense creation
- [x] edit targets and initial stocking while operational
- [x] completed/cancelled Cycle read-only
- [x] safe cycle cancellation before Harvest
- [x] cycle with Harvest must close through Final Harvest

### Operational history & correction

- [x] Sampling history + ACTIVE/HARVESTING correction
- [x] Feed history + correction
- [x] linked feed Expense recalculation after feed correction
- [x] Mortality history + population-safe correction
- [x] Manual Expense ledger + correction
- [x] completed/cancelled operational logs locked
- [x] Harvest history
- [x] Harvest correction intentionally locked because of HarvestLot/commercial references

## Phase 7 — History & Reporting — V0.10 / Phase B

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

### History

- [x] redundant `Lainnya > Overview` removed (`/more` redirects to `/history`)
- [x] Utility navigation reduced to `Riwayat | Laporan`
- [x] active and completed production cycles separated
- [x] active cycles show SR/FCR/ABW/biomass/running cost instead of fake final loss
- [x] completed cycles show Actual HPP/revenue/profit/margin
- [x] commercial Order → Delivered → Invoice → Paid → Outstanding reconciliation
- [x] date range filter

### Reports

- [x] period filter
- [x] executive KPI hierarchy instead of equal-weight card wall
- [x] monthly production revenue vs cost trend
- [x] monthly harvest kg visualization
- [x] current active-cycle SR/FCR/ABW/biomass/cost comparison
- [x] period Order vs Collection trend
- [x] current pipeline / receivable snapshot
- [x] customer contribution table
- [x] reporting remains read-only over PostgreSQL source of truth

## Phase 8 — Export / Documents

Status: **NEXT**

- [ ] CSV raw/history export
- [ ] CSV report export
- [ ] PDF Farm Report
- [ ] PDF Cycle Report
- [ ] PDF Invoice

## Phase 9 — CRM Usability & Control

- [ ] CustomerInteraction write timeline
- [ ] follow-up update/reminder workflow
- [ ] multi-item Sales Order UI
- [ ] order cancellation workflow
- [ ] receivable aging / overdue flags
- [ ] customer purchase history detail
- [ ] customer price history
- [ ] repeat-order metrics
- [ ] delivery proof / attachments
- [ ] quotation workflow

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
Fulfillment → Delivery
    ↓
Invoice → Payment
    ↓
History + Performance Report
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
