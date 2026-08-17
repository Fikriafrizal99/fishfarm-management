# FishFarm Management

Mobile-first aquaculture farm management system for operating fish-production cycles and managing the commercial pipeline from lead to payment.

## Vision

Turn fish-farming operations into one practical operating system:

**record → measure → detect → decide → harvest → sell → collect → improve**

The biological/production core remains deterministic and explainable. Sales CRM is a separate commercial domain and does not redefine farming KPI formulas.

## UI Concept

![FishFarm Management UI concept](docs/assets/fishfarm-ui-concept.svg)

The original mockup covers Dashboard, Pond Detail, Daily Input, and Finance & Harvest. Sales CRM is now implemented as a separate application area.

## Application Boundary — V0.8

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
```

The domains are **connected but loosely coupled**.

A Lead, Customer, Opportunity, or SalesOrder does not point directly to a pond or production cycle. A commercial order becomes tied to physical production only through:

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

This allows:

- orders before harvest exists,
- one harvest to serve several customers,
- one order to be fulfilled from several harvest lots,
- independent CRM pipeline tracking.

See [`docs/SALES_CRM.md`](docs/SALES_CRM.md).

## Current Production Flow

```text
Daily Input / Sampling / Harvest
              ↓
         Server Action
              ↓
       Application Service
              ↓
 PostgreSQL raw records + Expense ledger
              ↓
         KPI calculation
              ↓
      Rules Decision Engine
              ↓
OPEN / ACKNOWLEDGED / RESOLVED alerts
              ↓
      Dashboard + Pond Detail
```

The application does not substitute hardcoded KPI values when PostgreSQL is unavailable.

## Sales CRM Flow

```text
Lead
  ↓
Customer / Opportunity
  ↓
Sales Order
  ↓
Wait for / select HarvestLot
  ↓
Fulfillment Allocation
  ↓
Delivery
  ↓
Invoice
  ↓
Payment
```

V0.8 implements the CRM schema, Sales dashboard, Lead/Customer/Order write flows, HarvestLot creation, and fulfillment allocation. Delivery/Invoice/Payment are modeled in the database and represented in the development CRM scenario; their complete write UIs come in subsequent iterations.

## Implemented Routes

### Production

- `/` — farm / production dashboard
- `/input` — daily feed, mortality, and operating cost
- `/sampling` — sampling & growth
- `/ponds/[pondCode]` — pond/cycle detail
- `/harvest` — partial/final harvest

### Sales CRM

- `/sales` — separate Sales dashboard
- `/sales/leads` — lead recording and pipeline list
- `/sales/customers` — customer/account recording
- `/sales/orders` — basic confirmed Sales Order write flow
- `/sales/fulfillment` — order-to-HarvestLot allocation bridge

## Sales Dashboard KPIs

Initial commercial indicators:

- open leads
- qualified pipeline value
- confirmed order kg
- confirmed order value
- allocated / committed kg
- available harvested kg
- outstanding receivables
- cash collected this month

The Sales dashboard is deliberately separate from biological farm KPIs.

## HarvestLot Behavior

Every newly recorded Harvest now creates a sellable `HarvestLot` in the same database transaction.

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

The application does not maintain an unrelated manual duplicate stock balance.

## Transitional Harvest Commercial Fields

The existing V0.7 Harvest fields (`buyer_name`, `selling_price_per_kg`, `revenue_amount`) are intentionally retained for compatibility until runtime validation and migration planning are complete.

CRM is the future commercial source of truth, but V0.8 avoids a destructive migration before the current implementation has been validated locally.

## Live Decision Engine

Current deterministic rules:

- `DQ_SAMPLING_STALE`
- `DQ_INITIAL_BIOMASS_MISSING`
- `FCR_ABOVE_TARGET`
- `SR_BELOW_TARGET`
- `HARVEST_DATE_NEAR`

Status contract:

```text
no WARNING/ACTION_REQUIRED + metrics available → ON TARGET
WARNING                                   → MONITOR
ACTION_REQUIRED                           → NEEDS ATTENTION
```

The engine updates or resolves existing rule alerts instead of intentionally creating duplicates every evaluation.

## Development Database

The repository includes:

- PostgreSQL 17 in Docker Compose
- Prisma ORM 7
- PostgreSQL-specific constraints
- deterministic Nila farming seed
- deterministic Sales CRM seed
- automatic Decision Engine evaluation

### Windows / PowerShell

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
npm run dev
```

Equivalent bootstrap:

```powershell
npm run db:bootstrap
npm run dev
```

Useful commands:

```powershell
npm run prisma:studio
npm run decision:evaluate
npm run typecheck
npm run build
```

The seed chain creates farming data first, finance completion data second, and Sales CRM data third.

## Development CRM Scenario

The deterministic Sales seed includes:

- RM Sederhana Cianjur customer
- Pengepul Nila Cianjur customer
- Hotel Cianjur lead
- one open Nila opportunity
- `SO-DEV-001` for 100 kg Nila
- `INV-DEV-001`
- Rp500.000 partial payment / DP
- no fulfillment allocation yet

The missing allocation is intentional: it demonstrates that order demand can exist before harvested inventory exists.

After a new Harvest is recorded, a HarvestLot appears and can be allocated from `/sales/fulfillment`.

## Database Integrity

Production constraints cover stocking, feed, mortality, sampling, cost, harvest, and the one-open-cycle-per-pond rule.

V0.8 adds CRM constraints for:

- positive lead/opportunity quantity and price when supplied
- customer interaction target requirement
- positive SalesOrderItem quantity and price
- positive HarvestLot quantity
- positive fulfillment allocation
- positive delivery quantity
- non-negative invoice values
- positive payment amount

Cross-row over-allocation is enforced in the application service because it depends on current order and inventory balances.

## MVP / Module Status

### Production

1. Dashboard — **DB-backed**
2. Pond Management — **detail/read path implemented**
3. Production Cycles — **lifecycle read + harvest transitions implemented**
4. Daily Input — **write flow implemented**
5. Sampling & Growth — **write + trend implemented**
6. Expenses & Costing — **canonical ledger + cycle breakdown implemented**
7. Harvest — **partial/final write flow implemented**
8. Alerts / Decision Engine — **live V1 rule lifecycle implemented**

### Commercial

1. Sales Dashboard — **implemented**
2. Leads — **basic write/list implemented**
3. Customers — **basic write/list implemented**
4. Opportunities — **database model + seed; dedicated UI pending**
5. Sales Orders — **basic one-item write/list implemented**
6. Harvest Inventory — **HarvestLot auto-created from new harvests**
7. Fulfillment — **allocation service + page implemented**
8. Deliveries — **database model; UI pending**
9. Invoices — **database model + seed; write UI pending**
10. Payments — **database model + seed; write UI pending**

## Product Principles

- mobile-first and field-friendly
- PostgreSQL is the source of truth, not spreadsheets
- every biological KPI must trace back to production raw records
- observed, estimated, projected, and final values must not be conflated
- production and commercial domains have explicit boundaries
- CRM cannot silently change biological formulas
- fulfillment is the production-to-sales integration boundary
- alerts must explain why they fired
- no disease diagnosis from generic rule alerts
- historical cycles and commercial transactions must remain auditable
- AI is a later interpretation layer, not a replacement for formulas or ledgers

## Documentation

- [`docs/PRD.md`](docs/PRD.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md)
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md)
- [`docs/KPI_MODEL.md`](docs/KPI_MODEL.md)
- [`docs/DECISION_ENGINE.md`](docs/DECISION_ENGINE.md)
- [`docs/SALES_CRM.md`](docs/SALES_CRM.md)
- [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Technical Baseline

- **Frontend:** Next.js + TypeScript, responsive PWA
- **Backend:** Next.js server-side application/service layer
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Architecture:** modular monolith with domain boundaries
- **Notifications later:** Telegram / WhatsApp / push adapters

## Repository Structure

```text
app/                    Next.js pages + server actions
src/application/        use cases, transactions, query services
src/domain/             KPI formulas and deterministic decision rules
src/lib/                infrastructure helpers
prisma/                 schema + deterministic farming/CRM seeds
scripts/                DB constraints/helpers + Decision Engine runner
docs/                   product, architecture, farming, and CRM documentation
```

## Validation Status

V0.8 has been implemented remotely but has **not** yet passed the local Docker/Node validation gate.

When a laptop is available:

```powershell
git pull
npm install
npm run db:bootstrap
npm run typecheck
npm run build
npm run dev
```

Then validate both domain flows:

```text
PRODUCTION
Dashboard
→ Daily Input
→ Sampling
→ Pond Detail
→ Partial/Final Harvest
→ HarvestLot created
→ Decision alerts

SALES
Sales Dashboard
→ Lead
→ Customer
→ Sales Order
→ HarvestLot appears after Harvest
→ Fulfillment Allocation
→ Invoice/Payment seed visibility
```

Do not call V0.8 runtime-stable until those checks pass.

## Status

**Version:** 0.8  
**Phase:** Core Farming Cycle + Sales CRM Foundation  
**Production code:** implemented remotely  
**Sales CRM foundation:** implemented remotely  
**Runtime validation:** deferred and pending local Docker/Node execution
