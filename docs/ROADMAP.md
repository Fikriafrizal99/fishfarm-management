# Product Roadmap — FishFarm Management

Version: **0.9**

## Current State

The V0.8 production/database foundation has passed local bootstrap, seed, Decision Engine, TypeScript, production build, DB health, and UI sanity checks.

V0.9 completes the first end-to-end Sales CRM transaction flow in code and is now awaiting local runtime validation.

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
- [ ] authentication
- [ ] production deployment

## Phase 2 — Production Core

Status: **IMPLEMENTED / BASELINE VALIDATED**

- [x] Farm / Pond / ProductionCycle schema
- [x] daily feed / mortality / expense input
- [x] sampling input
- [x] ABW / biomass / SR / mortality / FCR / ADG
- [x] pond detail and growth chart
- [x] partial harvest
- [x] final harvest
- [x] HarvestLot auto-creation
- [x] Actual HPP / profit / margin / Final FCR
- [ ] full Farm/Pond/Cycle admin CRUD
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
- [ ] acknowledge alert action
- [ ] configurable rule UI
- [ ] mortality daily/trend rule
- [ ] finance-margin rules

## Phase 4 — Sales CRM Foundation — V0.8

Status: **COMPLETE**

- [x] Customer
- [x] Lead
- [x] SalesOpportunity
- [x] CustomerInteraction
- [x] SalesOrder / SalesOrderItem
- [x] HarvestLot
- [x] FulfillmentAllocation
- [x] Delivery / DeliveryItem schema
- [x] Invoice schema
- [x] Payment schema
- [x] Sales Dashboard
- [x] Lead UI
- [x] Customer UI
- [x] Order UI
- [x] Fulfillment UI
- [x] deterministic CRM seed
- [x] CRM constraints

## Phase 5 — End-to-End CRM Flow — V0.9

Status: **IMPLEMENTED / LOCAL VALIDATION PENDING**

### Acquisition & Pipeline

- [x] Opportunity workspace `/sales/pipeline`
- [x] Opportunity create action
- [x] Lead → QUALIFIED when used to create Opportunity
- [x] OPEN → WON conversion through Sales Order
- [x] originating Lead → CONVERTED after order conversion
- [x] Opportunity LOST action with order-safety guard
- [x] OPEN pipeline value remains separate from booked order value

### Order & Fulfillment

- [x] Sales Order can reference an Opportunity
- [x] Pipeline → Order prefilled navigation
- [x] Fulfillment allocation validates farm/species/order/lot balances
- [x] allocation synchronizes order fulfillment status

### Delivery

- [x] Delivery workspace `/sales/deliveries`
- [x] create PLANNED / DISPATCHED / DELIVERED delivery
- [x] PLANNED → DISPATCHED → DELIVERED progression
- [x] cancellation before delivery completion
- [x] delivery quantity cannot exceed allocated unbooked quantity
- [x] planned/dispatched quantity cannot be scheduled twice
- [x] only DELIVERED quantity can complete Sales Order

### Billing

- [x] Invoice workspace `/sales/invoices`
- [x] invoice number generation
- [x] remaining uninvoiced order balance validation
- [x] subtotal + adjustment snapshot
- [x] invoice VOID only before payment exists

### Collection

- [x] Payment workspace `/sales/payments`
- [x] CASH / TRANSFER / QRIS / OTHER
- [x] over-payment protection
- [x] DP / partial / final payment support
- [x] automatic `PARTIALLY_PAID` / `PAID` status
- [x] Sales Dashboard receivable and monthly collection remain Payment-based

### V0.9 Validation Gate

Run:

```powershell
git pull
npm run db:seed
npm run typecheck
npm run build
npm run dev
```

Then validate:

```text
OPEN Opportunity
→ convert to Sales Order
→ Harvest
→ HarvestLot
→ Fulfillment allocation
→ Delivery PLANNED
→ DISPATCHED
→ DELIVERED
→ Invoice
→ partial Payment
→ final Payment
→ Dashboard reconciliation
```

## Phase 6 — CRM Usability & Control

Next after V0.9 runtime validation:

- [ ] CustomerInteraction write timeline
- [ ] follow-up update/reminder workflow
- [ ] multi-item Sales Order UI
- [ ] order cancellation workflow
- [ ] receivable aging / overdue flags
- [ ] customer purchase history
- [ ] customer price history
- [ ] repeat-order metrics
- [ ] delivery proof / attachments
- [ ] quotation workflow

## Phase 7 — Production & Commercial History

Production:

- [ ] completed-cycle comparison
- [ ] FCR/SR/HPP/profit benchmarking
- [ ] cost composition history

Commercial:

- [ ] sales by customer
- [ ] kg sold by customer
- [ ] average selling price
- [ ] customer margin contribution
- [ ] receivable performance

## V1.0 Release Definition

```text
Production Cycle
    ↓
Daily Operations + Sampling
    ↓
KPI + Alerts
    ↓
Harvest → HarvestLot
    ↓
Lead / Opportunity / Sales Order
    ↓
Fulfillment
    ↓
Delivery
    ↓
Invoice
    ↓
Payment
    ↓
Production + Customer History
```

Core operation must not require spreadsheets.

## Post-MVP Candidates

- water-quality logs
- pH / DO / temperature
- feed inventory and procurement
- supplier management
- Telegram alerts
- PWA offline drafts/sync
- multi-user authorization
- attachments/photos
- PDF cycle/invoice documents
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
