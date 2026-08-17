# Development Database — FishFarm Management

Version: 0.3

## Goal

Provide a repeatable local PostgreSQL development environment with realistic FishFarm seed data, database-level domain constraints, and a simple health check.

## Stack

- PostgreSQL 17 via Docker Compose
- Prisma ORM 7
- PostgreSQL driver adapter (`@prisma/adapter-pg`)
- TypeScript seed and constraint scripts via `tsx`

## First-time setup on Windows / PowerShell

From the repository root:

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
```

The helper script:

1. creates `.env` when missing,
2. checks Docker and npm,
3. installs dependencies when needed,
4. starts PostgreSQL and waits until healthy,
5. generates Prisma Client,
6. pushes the Prisma schema,
7. applies PostgreSQL-specific constraints,
8. seeds development data.

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
npm run db:reset
npm run prisma:studio
```

### `db:up`
Starts PostgreSQL and waits for the health check.

### `db:down`
Stops containers but preserves database data in the Docker volume.

### `db:destroy`
Stops containers and deletes the PostgreSQL volume. Use only when you intentionally want a clean database.

### `db:reset`
Recreates the schema from the current Prisma model, reapplies custom constraints, and reseeds development data.

## Development seed

The seed is deterministic and safe to run repeatedly.

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
- treatment and expense records,
- one normal-information alert,
- one FCR action-required alert.

### KLM-001 scenario

Designed to represent a healthy/on-target pond:

- initial stock: 3,000 fish
- recorded mortality: 174 fish
- estimated live population before harvest: 2,826 fish
- latest average body weight: 270 g
- estimated standing biomass: about 763 kg
- cumulative development feed records: 834 kg
- approximate biological FCR: 1.14 when compared with initial biomass

This dataset intentionally resembles the product UI reference so frontend integration can be visually checked against known values.

### KLM-002 scenario

Designed to represent a pond needing attention:

- initial stock: 2,500 fish
- recorded mortality: 325 fish
- survival rate: about 87%
- latest average body weight: 210 g
- cumulative development feed: 613 kg
- approximate FCR: 1.42
- action-required alert for elevated FCR

## PostgreSQL-specific constraints

`prisma db push` creates the Prisma-managed schema. The project then runs `scripts/apply-db-constraints.ts` for constraints that are intentionally kept at database level.

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

## Migration strategy

During the very early schema-design phase, local bootstrap uses `prisma db push` so the model can still move quickly.

Before the schema becomes a shared staging/production contract:

1. reset a clean development database,
2. generate the initial Prisma migration,
3. incorporate the PostgreSQL-specific constraint SQL into that migration,
4. validate migration up/down behavior on a disposable database,
5. commit the migration history,
6. stop relying on `db push` for shared environments.

No production environment should use the local development credentials or Docker volume as its database.
