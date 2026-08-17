# Product Roadmap — FishFarm Management

Version: 0.8

## Current State

The project has moved beyond product-only foundation work. Production-cycle coding and the first Sales CRM foundation are now implemented remotely.

Runtime validation is intentionally deferred until the local Docker/Node environment is available.

## Phase 0 — Product & Architecture Foundation

Status: **SUBSTANTIALLY COMPLETE**

- [x] product vision
- [x] PRD V0.1 baseline
- [x] system architecture
- [x] production domain model
- [x] database schema baseline
- [x] KPI/formula model
- [x] Decision Engine model
- [x] UI visual reference
- [x] Sales CRM domain specification
- [x] production ↔ sales integration boundary
- [ ] consolidated API/use-case contract document
- [ ] formal test strategy document

## Phase 1 — Application & Development Database Foundation

Status: **IMPLEMENTED / VALIDATION PENDING**

- [x] Next.js + TypeScript skeleton
- [x] PostgreSQL
- [x] Prisma
- [x] Docker Compose local database
- [x] deterministic development seed
- [x] PostgreSQL-specific constraints
- [x] database bootstrap script
- [x] PWA manifest baseline
- [ ] authentication
- [ ] production deployment

## Phase 2 — Production Core

Status: **IMPLEMENTED / VALIDATION PENDING**

- [x] farm/pond/cycle schema
- [x] active cycle model
- [x] stocking data
- [x] daily feed input
- [x] mortality input
- [x] direct operating expense input
- [x] canonical Expense ledger linkage
- [x] sampling input
- [x] pond detail
- [x] partial harvest
- [x] final harvest
- [ ] full CRUD/admin screens for Farm/Pond/Cycle creation

## Phase 3 — Biological KPI Engine

Status: **IMPLEMENTED / VALIDATION PENDING**

- [x] ABW
- [x] estimated population
- [x] estimated biomass
- [x] mortality rate
- [x] estimated SR
- [x] cumulative feed
- [x] biomass-gain FCR
- [x] weight gain
- [x] ADG
- [x] growth history UI
- [x] observed vs estimated labeling
- [ ] formal unit-test suite

## Phase 4 — Finance & Harvest

Status: **IMPLEMENTED / VALIDATION PENDING**

- [x] production Expense ledger
- [x] linked feed/stocking cost handling
- [x] total cycle cost
- [x] current cost per standing biomass
- [x] partial/final harvest write flow
- [x] legacy Harvest revenue snapshot
- [x] Actual HPP for completed cycles
- [x] net profit
- [x] margin
- [x] Final FCR
- [ ] projected total remaining cost
- [ ] projected HPP/margin engine
- [ ] formal BEP UI

## Phase 5 — Production Dashboard & Decision Engine

Status: **IMPLEMENTED V1 / VALIDATION PENDING**

Dashboard:
- [x] active ponds
- [x] active estimated population
- [x] estimated biomass
- [x] running cost
- [x] SR/mortality/FCR
- [x] per-cycle status
- [x] detail links

Decision Engine:
- [x] deterministic rule framework
- [x] sampling-stale rule
- [x] initial-biomass missing rule
- [x] FCR target rule
- [x] SR target rule
- [x] harvest-date-near rule
- [x] alert open/update/resolve lifecycle
- [x] dashboard status derived from alert severity
- [ ] acknowledge alert UI
- [ ] configurable farm/species rule UI
- [ ] mortality daily/trend rules
- [ ] HPP/margin rules

## Phase 6 — Sales CRM Foundation — V0.8

Status: **IMPLEMENTED FOUNDATION / VALIDATION PENDING**

### Domain boundary

- [x] Sales CRM separated from production UI/domain
- [x] Lead/Customer/Opportunity/Order have no Pond/Cycle FK
- [x] HarvestLot introduced as sellable harvested inventory
- [x] FulfillmentAllocation introduced as integration bridge

### CRM data model

- [x] Customer
- [x] Lead
- [x] SalesOpportunity
- [x] CustomerInteraction
- [x] SalesOrder
- [x] SalesOrderItem
- [x] HarvestLot
- [x] FulfillmentAllocation
- [x] Delivery / DeliveryItem
- [x] Invoice
- [x] Payment

### CRM application

- [x] Sales Dashboard `/sales`
- [x] Lead write/list `/sales/leads`
- [x] Customer write/list `/sales/customers`
- [x] basic one-line Sales Order write/list `/sales/orders`
- [x] Fulfillment allocation `/sales/fulfillment`
- [x] Sales Dashboard pipeline/order/inventory/piutang metrics
- [x] Harvest automatically creates HarvestLot
- [x] deterministic CRM seed
- [x] CRM PostgreSQL constraints
- [ ] Opportunity dedicated UI
- [ ] interaction/follow-up update actions
- [ ] multi-item order UI
- [ ] Delivery write UI
- [ ] Invoice write UI
- [ ] Payment write UI
- [ ] order status automation from fulfillment/delivery
- [ ] lead conversion workflow

## Phase 7 — Runtime Validation Gate

Status: **PENDING LAPTOP**

This gate must happen before adding another large domain.

Commands:

```powershell
git pull
npm install
npm run db:bootstrap
npm run typecheck
npm run build
npm run dev
```

Production end-to-end validation:

```text
Dashboard
→ Daily Input
→ Sampling
→ Pond Detail
→ Partial Harvest
→ Final Harvest
→ Decision Engine
```

Sales end-to-end validation:

```text
Sales Dashboard
→ Create Lead
→ Create Customer
→ Create Sales Order before harvest
→ Record Harvest
→ Confirm HarvestLot appears
→ Allocate HarvestLot to order
→ Check available/allocated kg
→ Verify seeded invoice/payment balances
```

Validation must include database reset/idempotent seed checks.

## Phase 8 — Complete CRM Transaction Flow

After V0.8 validation:

- Opportunity management
- lead conversion
- CRM interaction timeline
- follow-up reminders
- delivery lifecycle
- invoice generation from order/delivery
- DP/partial/final payment recording
- receivable aging
- completed order history
- customer purchase history
- price history per customer
- repeat order metrics

## Phase 9 — Cycle & Business History

Production:
- completed-cycle summary
- cycle comparison by pond/species
- FCR/SR/HPP/profit comparison
- cost composition comparison

Commercial:
- sales by customer
- kg sold by customer
- average selling price
- customer margin contribution
- repeat-order rate
- receivable performance

## V1.0 Release Definition

V1.0 target expands beyond running a production cycle: it should cover a basic commercial close as well.

```text
Create/Run Production Cycle
        ↓
Daily Operations + Sampling
        ↓
KPI + Alerts
        ↓
Harvest
        ↓
HarvestLot
        ↓
Sales Order Fulfillment
        ↓
Delivery / Invoice
        ↓
Payment
        ↓
Production + Customer History
```

Core operation must not require spreadsheets.

## Post-MVP Candidates

- water-quality manual logs
- pH / DO / temperature
- feed inventory and procurement
- supplier management
- Telegram alerts
- PWA offline drafts/sync
- multi-user authorization
- attachments/photos
- PDF cycle/invoice reports
- WhatsApp CRM integration
- sales forecast vs projected harvest

## V2 / Data-Maturity Candidates

Only after enough clean real data exists:

- multi-farm organization
- biological benchmarking
- AI daily farm summary
- AI commercial daily summary
- cross-cycle anomaly detection
- predictive harvest date
- demand forecasting
- feed planning recommendations
- IoT ingestion

AI/ML remains a data-maturity milestone, not a substitute for production formulas, inventory allocations, invoices, or payments.
