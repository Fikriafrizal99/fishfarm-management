# Database Schema — FishFarm Management

Version: 0.8

## 1. Decision

V1 uses **PostgreSQL + Prisma ORM**. PostgreSQL is the application source of truth.

The database now contains two bounded areas:

- Production / aquaculture
- Sales CRM / commercial

They share `Farm` and `Species`, but do not share production internals directly.

## 2. Production Source-of-Truth

Raw facts remain authoritative:

- stocked fish → `Stocking`
- feed → `FeedingLog`
- mortality → `MortalityLog`
- biological sample → `SamplingLog`
- treatment → `TreatmentLog`
- production cost → `Expense`
- biological harvest → `Harvest`
- calculated audit/cache → `KpiSnapshot`
- decision output → `Alert`

`Expense` remains the canonical production-cost ledger.

## 3. Sales CRM Source-of-Truth

Commercial facts:

- account → `Customer`
- incoming prospect → `Lead`
- qualified pipeline → `SalesOpportunity`
- CRM touch/follow-up → `CustomerInteraction`
- customer commitment → `SalesOrder` + `SalesOrderItem`
- sellable harvest inventory → `HarvestLot`
- production-to-order link → `FulfillmentAllocation`
- shipment → `Delivery` + `DeliveryItem`
- billing → `Invoice`
- collection → `Payment`

## 4. Boundary Relationship

```text
PRODUCTION
ProductionCycle
      ↓
   Harvest
      ↓
 HarvestLot
      ↓
FulfillmentAllocation
      ↑
SalesOrderItem
      ↑
 SalesOrder
      ↑
  Customer
SALES CRM
```

`Customer`, `Lead`, `SalesOpportunity`, and `SalesOrder` do **not** contain `pond_id` or `cycle_id`.

This is intentional.

## 5. Main Relationships

```text
User ---< FarmMembership >--- Farm
                              |
                              +--- Production domain
                              |      +--- Pond
                              |      |     +--- ProductionCycle
                              |      |            +--- Stocking
                              |      |            +--- FeedingLog
                              |      |            +--- MortalityLog
                              |      |            +--- SamplingLog
                              |      |            +--- TreatmentLog
                              |      |            +--- Expense
                              |      |            +--- Harvest --- HarvestLot
                              |      |            +--- KpiSnapshot
                              |      |            +--- Alert
                              |      +--- FeedType
                              |
                              +--- Sales domain
                                     +--- Customer
                                     +--- Lead
                                     +--- SalesOpportunity
                                     +--- CustomerInteraction
                                     +--- SalesOrder
                                            +--- SalesOrderItem
                                                   +--- FulfillmentAllocation --- HarvestLot
                                            +--- Delivery
                                            +--- Invoice
                                                   +--- Payment
```

## 6. Harvest vs HarvestLot

`Harvest` is the biological/production event.

`HarvestLot` is the commercial inventory representation of that harvest.

Current relation:

```text
Harvest 1 — 0..1 HarvestLot
```

Newly recorded harvests create a HarvestLot automatically in the same application transaction.

HarvestLot fields:
- farm id
- harvest id unique
- species id
- lot code
- quantity kg
- optional quality grade
- notes

Available kg is derived from active allocations.

## 7. Fulfillment Integrity

The application validates before allocation:

```text
order farm == harvest lot farm
order species == harvest lot species
allocated kg <= order remaining kg
allocated kg <= lot available kg
```

Cross-row balance rules cannot be represented safely as simple CHECK constraints, so they live in the transactional application service.

The DB still enforces `allocated_kg > 0`.

## 8. Sales Order Semantics

SalesOrder can be created even when no HarvestLot exists.

A SalesOrderItem stores:
- species
- requested quantity kg
- unit price/kg

It does not store a production source.

Physical source is only added through FulfillmentAllocation.

## 9. Invoice & Payment Semantics

Invoice stores a financial snapshot:

```text
subtotal_amount
adjustment_amount
total_amount
```

Outstanding receivable is derived:

```text
outstanding = invoice total - sum(payments)
```

Multiple payments allow DP/partial settlement.

## 10. Transitional Harvest Fields

Before V0.8, Harvest stored:
- buyer name
- selling price/kg
- revenue amount

These fields remain in the executable Prisma schema for backwards compatibility until runtime validation and an explicit migration decision.

Do not use both Harvest revenue and CRM Invoice revenue as one combined sales total without defining the source-of-truth transition. That would double count commercial value.

## 11. Precision

Recommended PostgreSQL types:

- IDs: UUID
- money: `numeric(18,2)`
- kilograms: `numeric(14,3)`
- grams/cm: `numeric(12,3)`
- percentages: `numeric(7,4)`
- FCR: `numeric(8,4)`
- timestamps: `timestamptz`
- business/domain dates: `date`

Application code must not use binary floating point as the authoritative persisted money representation.

## 12. Database Constraints

The bootstrap applies additional PostgreSQL constraints after `prisma db push`.

### Production

- only one ACTIVE/HARVESTING cycle per pond
- sampling weight required
- positive stocking quantity
- positive feed quantity
- positive mortality quantity
- positive sample count
- non-negative expense amount
- positive harvest weight
- non-negative legacy harvest selling price

### Sales CRM

- Lead expected demand > 0 when present
- Lead expected price > 0 when present
- Opportunity quantity > 0 when present
- Opportunity price > 0 when present
- CustomerInteraction must reference a customer, lead, or opportunity
- SalesOrderItem quantity > 0
- SalesOrderItem price > 0
- HarvestLot quantity > 0
- FulfillmentAllocation quantity > 0
- DeliveryItem quantity > 0
- Invoice subtotal/total non-negative
- Payment amount > 0

Executable constraints live in:

```text
scripts/apply-db-constraints.ts
```

## 13. Canonical Production Cost Rule

Operational events may create one linked Expense using:

```text
source_type
source_id
```

Example:

```text
FeedingLog FL-123
18 kg × Rp12.000

Expense EXP-987
source_type = FEEDING
source_id   = FL-123
amount      = Rp216.000
```

KPI costing reads Expense only.

CRM invoices/payments are **not production costs**.

## 14. Prisma Schema

Executable schema:

[`../prisma/schema.prisma`](../prisma/schema.prisma)

Sales CRM reference:

[`SALES_CRM.md`](SALES_CRM.md)

## 15. Migration Strategy

The repository is still in a rapid local-development schema phase and uses `prisma db push` for bootstrap.

Before shared staging/production:

1. validate V0.8 locally,
2. reset a disposable development DB,
3. generate the initial migration with `--create-only`,
4. merge PostgreSQL-specific constraints into migration SQL,
5. validate migration on a clean DB,
6. review legacy Harvest commercial fields,
7. define CRM commercial source-of-truth migration,
8. commit migration history,
9. stop using `db push` for shared environments.

No production environment should use local development credentials or the Docker development volume.
