# FishFarm Management

Mobile-first aquaculture farm management system for recording pond operations, biological performance, production cost, harvest outcomes, and actionable farm decisions.

## Vision

Turn daily fish-farming records into a simple operating system for farmers: **record → measure → detect → decide → improve**.

The first version is intentionally not AI-first. Core calculations and alerts are deterministic and explainable. AI can be added later after enough real farm-cycle data exists.

## UI Concept

![FishFarm Management UI concept](docs/assets/fishfarm-ui-concept.svg)

The mockup above is the initial visual direction for Dashboard, Pond Detail, Daily Input, and Finance & Harvest. See [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md) for screen behavior and implementation guidance.

## Current Development Setup

The repository includes a repeatable local development database:

- PostgreSQL 17 in Docker Compose
- Prisma schema and generated-client workflow
- PostgreSQL-specific domain constraints
- deterministic Nila development seed
- `KLM-001` healthy/on-target scenario
- `KLM-002` needs-attention scenario
- database health endpoint

The main application flow now reaches biological sampling:

```text
Daily Input / Sampling
        ↓
Server Action
        ↓
Application Service
        ↓
PostgreSQL raw records + canonical Expense ledger
        ↓
KPI calculation
        ↓
Dashboard + Pond Detail
        ↓
SR / mortality / ABW / biomass / growth / FCR / cost / alerts
```

There is no hardcoded KPI fallback when PostgreSQL data is unavailable. The UI shows an explicit unavailable/empty state instead.

### Windows / PowerShell bootstrap

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
npm run dev
```

Or, after `.env` and dependencies already exist:

```powershell
npm run db:bootstrap
npm run dev
```

Inspect data with:

```powershell
npm run prisma:studio
```

Full database instructions: [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md).

## Implemented Application Flow — V0.5

### Dashboard — `/`

Reads active production cycles from PostgreSQL and calculates:

- active pond count
- estimated active fish population
- estimated standing biomass
- running production cost
- estimated survival rate
- mortality rate
- FCR based on biomass gain
- per-cycle status and open-alert count
- current cost per estimated standing kg

Each active pond links to its own detail page.

### Daily Input — `/input`

Server-backed operational form for:

- feed quantity
- mortality quantity
- additional operating expense
- expense category
- operational notes

Feed input creates a linked financial transaction when a feed unit cost exists, preventing feed cost from being counted twice.

### Sampling & Growth — `/sampling`

Server-backed biological sampling flow for:

- sample count
- total sample weight
- observed/direct ABW
- average length
- optional observed population
- sampling notes

The server derives ABW when total sample weight is provided. If both total sample weight and ABW are entered, the values are checked for reasonable consistency before the record is saved.

### Pond Detail — `/ponds/[pondCode]`

Displays one pond/cycle with database-backed calculations:

- stocked and estimated live population
- SR and mortality
- latest ABW
- estimated standing biomass
- cumulative feed
- biomass-gain FCR
- target SR / FCR
- cycle cost and cost per standing kg
- expense-category breakdown
- target harvest progress
- active alerts
- sampling growth history
- weight gain between samples
- Average Daily Gain (ADG)

Sampling and Daily Input can be opened from Pond Detail with the current cycle preselected.

## MVP Modules

1. Dashboard — **DB-backed V1**
2. Pond Management — **detail view started**
3. Production Cycles — **read model active**
4. Daily Input — **write flow implemented**
5. Sampling & Growth — **write + trend flow implemented**
6. Expenses & Costing — **ledger/read summary started**
7. Harvest & Sales — next
8. Alerts / Decision Engine — seed/read path exists; live evaluation next

## Core KPIs

- Survival Rate (SR)
- Mortality Rate
- Average Body Weight (ABW)
- Estimated Population
- Estimated Biomass
- Feed Conversion Ratio (FCR)
- Weight Gain
- Average Daily Gain (ADG)
- Feed Cost
- Total Production Cost
- Estimated / Actual HPP per kg
- Break-even Selling Price
- Revenue
- Net Profit
- Margin
- Cycle Duration
- Harvest Projection

## Product Principles

- Mobile-first and fast to input in the field
- One source of truth: application database, not spreadsheets
- Every important KPI must be traceable to raw records
- Operational, biological, and financial data are connected by production cycle
- Observed, estimated, projected, and final values must not be conflated
- Alerts must explain why they fired
- Historical cycles must remain auditable
- Start simple; add sensors, AI, and automation only when useful data exists

## Documentation

- [`docs/PRD.md`](docs/PRD.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md)
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md)
- [`docs/KPI_MODEL.md`](docs/KPI_MODEL.md)
- [`docs/DECISION_ENGINE.md`](docs/DECISION_ENGINE.md)
- [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Technical Baseline

- **Frontend:** Next.js + TypeScript, responsive PWA
- **Backend:** Next.js server-side application/service layer
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Architecture:** modular monolith
- **Notifications later:** Telegram / WhatsApp / push adapters

## Repository Structure

```text
app/                    Next.js presentation + server actions
src/application/        use-case orchestration / transactions
src/domain/             pure domain rules and KPI calculations
src/lib/                infrastructure helpers
prisma/                 database schema, seed and migrations
scripts/                development database helpers
docs/                   product and architecture documentation
```

## Database Health

After bootstrapping the database and running the application:

```text
GET /api/health/db
```

The endpoint confirms PostgreSQL connectivity and reports basic development row counts.

## Status

**Phase:** Sampling, Growth & Pond Detail  
**Version:** 0.5  
**Database:** local development bootstrap ready  
**Dashboard:** DB-backed  
**Daily operations:** write flow implemented  
**Sampling & growth:** write + read trend implemented  
**Pond detail:** DB-backed biological/financial overview implemented  
**Next:** Harvest & Sales, Actual HPP, then live Decision Engine evaluation
