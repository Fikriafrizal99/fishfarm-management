# Development Database — FishFarm Management

Version: 0.7

## Goal

Provide a repeatable local PostgreSQL development environment with realistic FishFarm seed data, database-level domain constraints, live Decision Engine evaluation, and a simple health check.

## Stack

- PostgreSQL 17 via Docker Compose
- Prisma ORM 7
- PostgreSQL driver adapter (`@prisma/adapter-pg`)
- TypeScript seed, constraint, and Decision Engine scripts via `tsx`

## First-time setup on Windows / PowerShell

From the repository root:

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
```

The helper script calls `npm run db:bootstrap`, which:

1. starts PostgreSQL and waits until healthy,
2. generates Prisma Client,
3. pushes the Prisma schema,
4. applies PostgreSQL-specific constraints,
5. seeds deterministic development raw data,
6. removes legacy static development alerts,
7. runs the live Decision Engine for every active cycle.

Equivalent manual command after dependencies and `.env` exist:

```powershell
npm run db:bootstrap
```

## Database connection

Default local values:

```text
host: localhost
port: 5432
database: fishfarm_dev
user: fishfarm
password: fishfarm_dev
```

Connection string:

```text
postgresql://fishfarm:fishfarm_dev@localhost:5432/fishfarm_dev?schema=public
```

These credentials are for local development only.

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
```

### `db:up`
Starts PostgreSQL and waits for the health check.

### `db:down`
Stops containers but preserves database data in the Docker volume.

### `db:destroy`
Stops containers and deletes the PostgreSQL volume. Use only when you intentionally want a clean database.

### `decision:evaluate`
Runs the live rules-based Decision Engine for all `ACTIVE` / `HARVESTING` cycles. It also removes the old `dev-seed-v1` static alerts so development status comes from the same engine used by application writes.

### `db:reset`
Recreates the schema, reapplies custom constraints, reseeds raw development data, and reevaluates alerts.

## Development seed

The raw-data seed is deterministic and safe to run repeatedly.

It creates:

- one development owner user,
- one development farm,
- Nila master species,
- two ponds: `KLM-001` and `KLM-002`,
- two active production cycles,
- stocking data,
- feed records,
- mortality records,
- growth sampling,
- treatment and expense records.

Alert state after bootstrap is **not taken from hardcoded seed examples**. `npm run decision:evaluate` creates/updates alerts from current raw data and rule configuration.

### KLM-001 scenario

Designed to represent a relatively healthy/on-target pond:

- initial stock: 3,000 fish
- recorded mortality: 174 fish
- estimated live population before harvest: 2,826 fish
- latest average body weight: 270 g
- estimated standing biomass: about 763 kg
- cumulative development feed records: 834 kg
- approximate biological FCR: 1.14

This dataset intentionally resembles the UI reference so frontend integration can be checked against known values.

### KLM-002 scenario

Designed to exercise monitoring rules:

- initial stock: 2,500 fish
- recorded mortality: 325 fish
- estimated SR: about 87%
- latest average body weight: 210 g
- cumulative development feed: 613 kg
- approximate FCR: about 1.42

The final alert severity is determined by the live Decision Engine configuration, not by a static seed alert.

## Decision Engine bootstrap

Current initial rules:

```text
DQ_SAMPLING_STALE
DQ_INITIAL_BIOMASS_MISSING
FCR_ABOVE_TARGET
SR_BELOW_TARGET
HARVEST_DATE_NEAR
```

Default rule values live in:

```text
src/domain/decision/config.ts
```

Application writes for Daily Input, Sampling, and Harvest also reevaluate the affected cycle after the raw transaction succeeds.

## PostgreSQL-specific constraints

`prisma db push` creates the Prisma-managed schema. The project then runs `scripts/apply-db-constraints.ts` for constraints intentionally kept at database level.

Current constraints include:

- only one `ACTIVE` or `HARVESTING` cycle per pond,
- sampling must contain total sample weight or average weight,
- positive stocking quantity,
- positive feed quantity,
- positive mortality quantity,
- positive sample count,
- non-negative expenses,
- positive harvest weight,
- non-negative selling price.

These rules are also expected to be validated in the application/service layer. Database constraints are the final safety net.

## Health check

After database bootstrap and application start:

```text
GET /api/health/db
```

Expected development response:

```json
{
  "status": "ok",
  "database": "connected",
  "data": {
    "farms": 1,
    "ponds": 2,
    "activeCycles": 2
  }
}
```

## Prisma Studio

Inspect development data visually:

```powershell
npm run prisma:studio
```

## Runtime validation gate

When a local development machine is available, validate V0.7 with:

```powershell
npm run db:bootstrap
npm run typecheck
npm run build
npm run dev
```

Then verify end-to-end:

```text
Dashboard
→ Daily Input
→ Decision Engine update
→ Sampling
→ Growth/FCR recalculation
→ Partial Harvest
→ Final Harvest
→ Completed-cycle Actual HPP / revenue / profit / margin / Final FCR
```

## Migration strategy

During the early schema-design phase, local bootstrap uses `prisma db push` so the model can move quickly.

Before the schema becomes a shared staging/production contract:

1. reset a clean development database,
2. generate the initial Prisma migration,
3. incorporate PostgreSQL-specific constraint SQL into that migration,
4. validate migration behavior on a disposable database,
5. commit migration history,
6. stop relying on `db push` for shared environments.

No production environment should use the local development credentials or Docker volume as its database.
