# Development Database — FishFarm Management

Version: 0.8

## Goal

Provide a repeatable local PostgreSQL development environment containing both:

- aquaculture production data,
- Sales CRM development data,

plus database constraints and live Decision Engine evaluation.

## Stack

- PostgreSQL 17 via Docker Compose
- Prisma ORM 7
- PostgreSQL driver adapter (`@prisma/adapter-pg`)
- TypeScript seed/constraint/Decision scripts via `tsx`

## First-time setup on Windows / PowerShell

From repository root:

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
```

The helper calls `npm run db:bootstrap`:

1. start PostgreSQL and wait until healthy,
2. generate Prisma Client,
3. push Prisma schema,
4. apply PostgreSQL-specific constraints,
5. execute `prisma/seed-all.ts`,
6. seed farming data,
7. complete the KLM-002 finance ledger,
8. seed Sales CRM data,
9. remove legacy static development alerts,
10. run the live Decision Engine for active cycles.

Equivalent:

```powershell
npm run db:bootstrap
```

## Database connection

```text
host: localhost
port: 5432
database: fishfarm_dev
user: fishfarm
password: fishfarm_dev
```

```text
postgresql://fishfarm:fishfarm_dev@localhost:5432/fishfarm_dev?schema=public
```

Local development only.

## Useful commands

```powershell
npm run db:up
npm run db:down
npm run db:destroy
npm run db:push
npm run db:constraints
npm run db:seed
npm run decision:evaluate
npm run db:reset
npm run prisma:studio
npm run typecheck
npm run build
```

## Seed Chain

Prisma invokes one cross-platform orchestrator:

```text
prisma.config.ts
      ↓
prisma/seed-all.ts
      ↓
prisma/seed.ts
      ↓
prisma/seed-finance-completion.ts
      ↓
prisma/seed-sales.ts
```

`seed-all.ts` runs each stage sequentially and exits with an error if any stage fails. This avoids shell-chain differences between Windows and Unix-like environments.

### Production seed

Creates:
- one owner user,
- one farm,
- Nila species,
- KLM-001 and KLM-002,
- two active production cycles,
- stocking,
- feeding,
- mortality,
- sampling,
- treatment and production costs.

Legacy static development alerts are intentionally removed by `decision:evaluate` after seeding so application state comes from the live rules engine.

### KLM-001

- stock 3,000 fish
- mortality 174
- estimated live fish 2,826
- latest ABW 270 g
- estimated biomass about 763 kg
- cumulative feed 834 kg
- approximate FCR about 1.14

### KLM-002

- stock 2,500 fish
- mortality 325
- estimated SR about 87%
- latest ABW 210 g
- cumulative feed 613 kg
- approximate FCR about 1.42
- finance-completion seed ensures seed/feed costs exist in canonical Expense ledger

Expected deterministic KLM-002 finance seed:

```text
seed cost  = Rp1.875.000
feed cost  = 613 × Rp10.132 = Rp6.210.916
total      = Rp8.085.916
```

With the seeded standing biomass of about 456.75 kg, the dashboard cost per standing kg should therefore be around Rp17.703/kg rather than Rp0.

## Sales CRM Seed

`prisma/seed-sales.ts` intentionally creates commercial demand **without a production allocation**.

It includes:

- Customer: `RM Sederhana Cianjur`
- Customer: `Pengepul Nila Cianjur`
- Lead: `Hotel Cianjur — kebutuhan Nila mingguan`
- one WhatsApp interaction/follow-up
- one open Nila opportunity
- Sales Order: `SO-DEV-001`
- order quantity: 100 kg
- order price: Rp23.500/kg
- Invoice: `INV-DEV-001`
- invoice total: Rp2.350.000
- Payment/DP: Rp500.000
- invoice status: `PARTIALLY_PAID`
- no FulfillmentAllocation initially

The missing allocation is deliberate. It verifies the domain rule:

```text
Sales order may exist before harvested inventory exists.
```

When a user later records a Harvest, the Harvest service creates a HarvestLot automatically. That lot becomes visible in `/sales/fulfillment` and can then be allocated to the order.

## HarvestLot Development Behavior

A newly recorded harvest writes both production and inventory facts inside one transaction:

```text
Harvest
  +
HarvestLot
```

HarvestLot does not duplicate an arbitrary stock input; its `quantity_kg` originates from the Harvest weight.

Available quantity is derived after allocations.

## Decision Engine Bootstrap

Current initial rules:

```text
DQ_SAMPLING_STALE
DQ_INITIAL_BIOMASS_MISSING
FCR_ABOVE_TARGET
SR_BELOW_TARGET
HARVEST_DATE_NEAR
```

Application writes for Daily Input, Sampling, and Harvest also reevaluate the affected cycle.

Sales CRM writes do not execute biological Decision Engine rules.

## PostgreSQL-specific Constraints

Production:
- one ACTIVE/HARVESTING cycle per pond
- sampling weight required
- positive stocking/feed/mortality/sample quantities
- non-negative Expense
- positive harvest weight
- non-negative legacy harvest price

Sales CRM:
- positive optional Lead demand/price
- positive optional Opportunity quantity/price
- CustomerInteraction must reference a CRM target
- positive SalesOrderItem quantity and price
- positive HarvestLot quantity
- positive FulfillmentAllocation quantity
- positive DeliveryItem quantity
- non-negative Invoice subtotal/total
- positive Payment amount

Application services add cross-row transactional rules such as preventing over-allocation of order quantity or harvest inventory.

## Prisma Studio

```powershell
npm run prisma:studio
```

Useful tables to inspect for V0.8:

```text
customers
leads
sales_opportunities
customer_interactions
sales_orders
sales_order_items
harvest_lots
fulfillment_allocations
invoices
payments
```

## Runtime Validation Gate — V0.8

Validation progress recorded on 2026-08-17:

- PostgreSQL Docker bootstrap: **PASS**
- Prisma schema push: **PASS**
- 22 development constraints: **PASS**
- Prisma Client generation: **PASS**
- TypeScript typecheck: **PASS**
- optimized Next.js production build: **PASS**
- `/api/health/db`: **PASS**
- production dashboard render: **PASS**
- deterministic secondary seed stages: **FIXED; RECHECK REQUIRED**
- full production + CRM write-flow E2E: **PENDING**

Current local validation commands:

```powershell
git pull
npm run db:seed
npm run decision:evaluate
npm run typecheck
npm run build
npm run dev
```

### Production flow

```text
Dashboard
→ Daily Input
→ Sampling
→ Pond Detail
→ Harvest
→ Decision Engine
```

### CRM flow

```text
/sales
→ verify seeded CRM KPIs
→ create Lead
→ create Customer
→ create Sales Order
→ confirm order can exist with 0 HarvestLot
→ record Harvest
→ verify HarvestLot appears
→ /sales/fulfillment
→ allocate quantity
→ verify available and allocated kg recalculate
→ inspect invoice/payment seed balances
```

Also run `db:reset` once before release candidate sign-off to verify deterministic/idempotent seed behavior from a clean schema.

## Migration Strategy

Local development still uses `prisma db push` because schema boundaries are actively being developed.

Before staging/production:

1. pass V0.8 runtime validation,
2. create a clean disposable DB,
3. generate initial migration with `--create-only`,
4. merge PostgreSQL-specific constraints into migration SQL,
5. validate migration on clean DB,
6. decide transition of legacy Harvest sale fields to CRM source-of-truth,
7. commit migration history,
8. stop using `db push` in shared environments.

No production environment should use development credentials or the local Docker volume.
