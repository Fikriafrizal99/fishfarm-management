# Development Database — FishFarm Management

Version: **0.9**

## Goal

Provide a repeatable local PostgreSQL environment containing:

- aquaculture production data,
- Sales CRM development data,
- PostgreSQL constraints,
- deterministic Decision Engine state.

## Stack

- PostgreSQL 17 via Docker Compose
- Prisma ORM 7
- `@prisma/adapter-pg`
- TypeScript scripts via `tsx`

## Bootstrap

```powershell
Copy-Item .env.example .env
npm install
npm run db:bootstrap
```

Bootstrap sequence:

```text
PostgreSQL up
→ Prisma generate
→ schema push
→ DB constraints
→ seed-all.ts
   → production seed
   → finance completion seed
   → Sales CRM seed
→ Decision Engine evaluation
```

## Useful Commands

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

## Production Seed Snapshot

### KLM-001

- stock: 3,000 fish
- mortality: 174
- estimated live: 2,826
- latest ABW: 270 g
- estimated biomass: about 763 kg
- cumulative feed: 834 kg
- FCR: about 1.14

### KLM-002

- stock: 2,500 fish
- mortality: 325
- estimated SR: about 87%
- latest ABW: 210 g
- cumulative feed: 613 kg
- FCR: about 1.42
- canonical seed + feed expense: Rp8.085.916

## Sales CRM Seed — V0.9

`prisma/seed-sales.ts` creates a deterministic commercial scenario while intentionally leaving HarvestLot allocation empty.

Accounts:

- `RM Sederhana Cianjur`
- `Pengepul Nila Cianjur`

Acquisition:

- Lead: `Hotel Cianjur — kebutuhan Nila mingguan`
- WhatsApp interaction / follow-up

Pipeline:

- `Repeat order Nila RM Sederhana` → `WON` because it is already linked to `SO-DEV-001`
- `Pasokan Nila — Pengepul Cianjur` → `OPEN` for Pipeline → Order validation

Order / finance:

- `SO-DEV-001` → 100 kg Nila @ Rp23.500/kg
- `INV-DEV-001` → Rp2.350.000
- Payment/DP → Rp500.000
- Invoice status → `PARTIALLY_PAID`

Inventory bridge:

- no FulfillmentAllocation initially
- no Delivery initially

The missing allocation is deliberate:

```text
commercial demand may exist before harvested inventory exists
```

After a new Harvest is recorded:

```text
Harvest
→ HarvestLot
→ /sales/fulfillment
→ /sales/deliveries
```

## PostgreSQL Constraints

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
- CustomerInteraction requires a target
- positive SalesOrderItem quantity and price
- positive HarvestLot quantity
- positive FulfillmentAllocation quantity
- positive DeliveryItem quantity
- non-negative Invoice subtotal / total
- positive Payment amount

Cross-row business balances are intentionally enforced in application transactions rather than static DB checks:

- order quantity over-allocation
- HarvestLot over-allocation
- delivery beyond allocated/unbooked quantity
- invoice subtotal beyond remaining uninvoiced order value
- payment beyond outstanding invoice value

## Application-Level CRM Invariants — V0.9

### Opportunity

- Customer must belong to farm and be active.
- optional Lead must belong to the same farm.
- Lead becomes `QUALIFIED` when used to create Opportunity.
- only `OPEN` Opportunity can be converted to Sales Order.
- conversion sets Opportunity `WON` and originating Lead `CONVERTED`.

### Fulfillment / Delivery

- allocation must match farm and species.
- allocation starts order fulfillment but does not mean delivered.
- PLANNED/DISPATCHED Delivery quantity reserves its allocated slot.
- only `DELIVERED` quantity counts toward completed order quantity.
- Sales Order becomes `FULFILLED` only when requested quantity is actually delivered.

### Invoice / Payment

- Invoice cannot overbill remaining order subtotal.
- Invoice with Payment cannot be VOID.
- Payment cannot exceed outstanding invoice balance.
- invoice status updates automatically after Payment.

## Prisma Studio

```powershell
npm run prisma:studio
```

CRM tables:

```text
customers
leads
sales_opportunities
customer_interactions
sales_orders
sales_order_items
harvest_lots
fulfillment_allocations
deliveries
delivery_items
invoices
payments
```

## Validation Status

V0.8 baseline already passed locally:

- PostgreSQL Docker bootstrap — **PASS**
- Prisma schema push — **PASS**
- DB constraints — **PASS**
- Prisma Client generation — **PASS**
- TypeScript — **PASS**
- Next.js production build — **PASS**
- `/api/health/db` — **PASS**
- production/dashboard UI sanity — **PASS**

V0.9 CRM flow requires a new local gate:

```powershell
git pull
npm run db:seed
npm run typecheck
npm run build
npm run dev
```

E2E scenario:

```text
/sales/pipeline
→ use OPEN seed opportunity
→ create Sales Order
→ record partial Harvest if no HarvestLot exists
→ /sales/fulfillment allocate stock
→ /sales/deliveries create PLANNED delivery
→ advance DISPATCHED
→ advance DELIVERED
→ /sales/invoices create invoice for an uninvoiced order
→ /sales/payments partial payment
→ final payment
→ verify Sales Dashboard KPIs
```

Run `db:reset` only for clean-schema release-candidate verification, not for normal incremental validation.

## Migration Strategy

Local development still uses `prisma db push` while domain boundaries are evolving.

Before staging/production:

1. pass V0.9 E2E validation,
2. validate deterministic reset on a disposable DB,
3. create initial migration history,
4. incorporate PostgreSQL-specific constraints into migrations,
5. validate migration on a clean database,
6. decide final transition policy for legacy Harvest commercial snapshot fields,
7. stop using `db push` in shared environments.
