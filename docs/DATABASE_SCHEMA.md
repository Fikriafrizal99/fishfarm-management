# Database Schema — FishFarm Management

Version: 0.2

## 1. Decision

V1 uses **PostgreSQL + Prisma ORM**. The database is the source of truth; spreadsheets are not used as application storage.

The central aggregate remains `ProductionCycle`. Operational, biological, and financial records attach to a cycle whenever possible.

## 2. Source-of-truth model

Raw facts are stored; cumulative and ratio values are derived.

- stock quantity → `Stocking`
- feed quantity → `FeedingLog`
- dead fish → `MortalityLog`
- sampled weight → `SamplingLog`
- treatment → `TreatmentLog`
- canonical cost transaction → `Expense`
- harvest weight and sale price → `Harvest`
- calculated state → `KpiSnapshot`
- decision output → `Alert`

`KpiSnapshot` is a cache/audit snapshot, never the authoritative replacement for raw logs.

## 3. Main relationship

```text
User ---< FarmMembership >--- Farm
                              |
                              +---< Pond
                              |      |
                              |      +---< ProductionCycle >--- Species
                              |                 |
                              |                 +---< Stocking
                              |                 +---< FeedingLog >--- FeedType
                              |                 +---< MortalityLog
                              |                 +---< SamplingLog
                              |                 +---< TreatmentLog
                              |                 +---< Expense
                              |                 +---< Harvest
                              |                 +---< KpiSnapshot
                              |                 +---< Alert
                              |
                              +---< Expense (shared farm costs)
```

## 4. Canonical financial rule

`Expense` is the canonical ledger for production cost.

Operational events may carry a cost snapshot for traceability, but the application service must create at most one linked `Expense` using:

- `source_type`
- `source_id`

This prevents a feeding event from being counted once from `FeedingLog` and again from a manually duplicated expense.

Examples:

```text
FeedingLog FL-123
quantity = 18 kg
unit_cost = 12,000

Expense EXP-987
source_type = FEEDING
source_id   = FL-123
amount      = 216,000
category    = FEED
```

KPI costing reads `Expense`, not both tables.

## 5. Precision

Recommended PostgreSQL types:

- IDs: UUID
- money: `numeric(18,2)`
- kg: `numeric(14,3)`
- grams/cm: `numeric(12,3)`
- percentage: `numeric(7,4)`
- FCR: `numeric(8,4)`
- timestamps: `timestamptz`
- domain dates: `date`

Application code must not rely on binary floating-point for authoritative money calculations.

## 6. Important constraints

### One active cycle per pond

Prisma does not express a partial unique index directly. The first real migration should add:

```sql
CREATE UNIQUE INDEX production_cycle_one_open_cycle_per_pond
ON production_cycles (pond_id)
WHERE status IN ('ACTIVE', 'HARVESTING');
```

### Sampling input

At least one of `total_sample_weight_kg` or `average_weight_g` must exist. Enforce in the service layer and preferably with a migration-level check constraint.

```sql
ALTER TABLE sampling_logs
ADD CONSTRAINT sampling_weight_required
CHECK (
  total_sample_weight_kg IS NOT NULL
  OR average_weight_g IS NOT NULL
);
```

### Positive quantities

Service validation must reject zero/negative values for stocking quantity, feed quantity, mortality quantity, sample count, harvest weight, and expense amount.

## 7. Population semantics

Exact live population can only be derived when fish counts are known.

```text
estimated_population =
  stocked fish
  - recorded mortality
  - harvested fish count (when known)
```

If a partial harvest has weight but no fish count, the dashboard must label population and survival values as **estimated** rather than exact.

## 8. Biomass semantics

Standing biomass:

```text
latest reliable ABW × estimated live population
```

Harvested biomass remains separate. Do not subtract harvest weight from the latest standing biomass unless the calculation context explicitly requires it.

## 9. FCR basis

Cycle FCR should use cumulative feed divided by biological biomass gain, with harvested biomass included when partial harvests have occurred.

The exact formula/version is documented in `KPI_MODEL.md` and must be versioned when calculation behavior changes.

## 10. Audit rules

All mutable transaction tables include timestamps. Completed cycles should not allow destructive edits without an explicit correction flow.

Later audit extensions can add:

- `updated_by`
- correction reason
- revision history
- soft-delete metadata

## 11. Prisma schema

The executable model lives in [`../prisma/schema.prisma`](../prisma/schema.prisma).

Before the first database migration:

1. review schema with real farm assumptions,
2. configure `DATABASE_URL`,
3. run Prisma generation,
4. create migration with `--create-only`,
5. add the custom SQL constraints above,
6. apply migration to a development database.
