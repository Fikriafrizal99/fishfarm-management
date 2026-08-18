# FishFarm Management

Mobile-first aquaculture farm management system for operating fish-production cycles and managing the commercial pipeline from lead to payment.

## Vision

**record → measure → detect → decide → harvest → sell → deliver → collect → improve**

Production remains deterministic and explainable. Sales CRM is a separate commercial domain and does not redefine farming KPI formulas.

## Application Boundary — V0.9

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

`Lead`, `Customer`, `Opportunity`, and `SalesOrder` never need a direct Pond or ProductionCycle reference. Physical production becomes commercially committed only through:

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

This allows orders before harvest exists, one harvest to serve multiple customers, one order to use multiple harvest lots, and independent demand forecasting.

See [`docs/SALES_CRM.md`](docs/SALES_CRM.md).

## Production Flow

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

## Sales CRM Flow — V0.9

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

- creating an Opportunity from a Lead marks the Lead `QUALIFIED`,
- converting an OPEN Opportunity into a Sales Order marks the Opportunity `WON` and its originating Lead `CONVERTED`,
- Fulfillment reserves harvested stock without directly binding CRM records to ponds,
- Sales Order becomes `PARTIALLY_FULFILLED` after stock is allocated or partially delivered,
- Sales Order becomes `FULFILLED` only when requested quantity has actually been delivered,
- Invoice stores a billing snapshot independent from later source-order edits,
- Payment automatically changes Invoice status to `PARTIALLY_PAID` or `PAID`.

## Implemented Routes

### Main / Production

- `/` — farm dashboard
- `/budidaya` — production workspace
- `/input` — daily feed, mortality, and operational input
- `/sampling` — sampling & growth
- `/harvest` — partial/final harvest
- `/expenses` — direct operating costs
- `/ponds/[pondCode]` — pond/cycle detail
- `/alerts` — alert center
- `/more` — secondary modules
- `/api/health/db` — PostgreSQL health check

### Sales CRM

- `/sales` — commercial dashboard
- `/sales/leads` — acquisition / incoming demand
- `/sales/customers` — customer accounts
- `/sales/pipeline` — qualified Opportunities
- `/sales/orders` — Sales Orders and Opportunity conversion
- `/sales/fulfillment` — SalesOrderItem ↔ HarvestLot allocation
- `/sales/deliveries` — delivery creation and status progression
- `/sales/invoices` — billing / invoice issuance
- `/sales/payments` — DP, partial payment, and settlement

## Sales Dashboard KPIs

- open leads
- OPEN opportunity pipeline value
- active order kg
- active order value
- allocated kg
- available harvested kg
- outstanding receivables
- cash collected this month

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

No unrelated duplicate manual stock balance is maintained.

## Commercial State Rules

### Lead

```text
NEW → CONTACTED → QUALIFIED → CONVERTED
                         ↘ LOST
```

### Opportunity

```text
OPEN → WON
   ↘ LOST
```

`WON` is normally produced by conversion into a Sales Order.

### Sales Order

```text
CONFIRMED
    ↓ allocation / delivery starts
PARTIALLY_FULFILLED
    ↓ requested quantity delivered
FULFILLED
```

### Delivery

```text
PLANNED → DISPATCHED → DELIVERED
    ↘ CANCELLED
```

### Invoice / Payment

```text
ISSUED → PARTIALLY_PAID → PAID
   ↘ VOID (only before payment exists)
```

## Transitional Harvest Commercial Fields

The existing Harvest fields `buyer_name`, `selling_price_per_kg`, and `revenue_amount` remain as compatibility snapshots. CRM is the commercial source-of-truth direction, but the legacy fields are not destructively removed in V0.9.

## Development Database

- PostgreSQL 17 in Docker Compose
- Prisma ORM 7
- PostgreSQL-specific constraints
- deterministic farming seed
- deterministic CRM seed
- automatic Decision Engine evaluation

### Windows / PowerShell

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

## Development CRM Scenario

The CRM seed includes:

- RM Sederhana Cianjur customer
- Pengepul Nila Cianjur customer
- Hotel Cianjur lead
- one `WON` opportunity already linked to `SO-DEV-001`
- one separate `OPEN` Nila opportunity for Pipeline → Order testing
- `SO-DEV-001` for 100 kg Nila
- `INV-DEV-001`
- Rp500.000 partial payment / DP
- no HarvestLot allocation yet

The missing allocation is intentional. It demonstrates that demand/order/billing can exist before harvested inventory is available.

After a new Harvest is recorded, a HarvestLot can be allocated from `/sales/fulfillment`, then delivered from `/sales/deliveries`.

## Database Integrity

Production constraints cover stocking, feed, mortality, sampling, cost, harvest, and one-open-cycle-per-pond.

Commercial constraints cover:

- positive lead/opportunity quantity and price when supplied
- customer interaction target requirement
- positive SalesOrderItem quantity and price
- positive HarvestLot quantity
- positive fulfillment allocation
- positive delivery quantity
- non-negative invoice subtotal / total
- positive payment amount

Cross-row balances such as order over-allocation, delivery beyond allocated stock, duplicate over-invoicing, and over-payment are enforced in application services because they depend on current transactional balances.

## Product Principles

- PostgreSQL is the source of truth, not spreadsheets
- observed, estimated, projected, and actual-final values remain distinct
- every production KPI traces back to raw production records
- production and commercial domains have explicit boundaries
- CRM cannot silently change biological formulas
- HarvestLot/Fulfillment is the production-to-sales bridge
- invoice totals are historical billing snapshots
- payment is the cash-collection source of truth
- alerts must explain why they fired
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
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Technical Baseline

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Backend:** Next.js server-side application/service layer
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Architecture:** modular monolith with explicit domain boundaries

## Validation Status

The V0.8 production/database foundation has already passed local bootstrap, Prisma generation, DB constraints/seed, Decision Engine evaluation, TypeScript, production build, DB health check, and visual sanity checks.

**V0.9 CRM flow is implemented remotely and now requires local validation.**

Validation gate:

```powershell
git pull
npm run db:seed
npm run typecheck
npm run build
npm run dev
```

Then validate:

```text
Pipeline
→ convert Opportunity to Order
→ Harvest / HarvestLot
→ Fulfillment allocation
→ Delivery
→ Invoice
→ Payment
→ verify Sales Dashboard KPIs/statuses
```

## Status

**Version:** 0.9.0  
**Phase:** End-to-End Sales CRM Flow  
**Production core:** locally validated V0.8 baseline  
**CRM V0.9:** implemented, local runtime validation pending
