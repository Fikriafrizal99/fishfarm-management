# FishFarm Management

Mobile-first aquaculture farm management system for recording pond operations, biological performance, production cost, harvest outcomes, and actionable farm decisions.

## Vision

Turn daily fish-farming records into a simple operating system for farmers: **record → measure → detect → decide → improve**.

The first version is intentionally not AI-first. Core calculations and alerts are deterministic and explainable. AI can be added later after enough real farm-cycle data exists.

## UI Concept

![FishFarm Management UI concept](docs/assets/fishfarm-ui-concept.svg)

The mockup above is the initial visual direction for Dashboard, Pond Detail, Daily Input, and Finance & Harvest. See [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md) for screen behavior and implementation guidance.

## Current Development Setup

The repository now includes a repeatable local development database:

- PostgreSQL 17 in Docker Compose
- Prisma schema and generated-client workflow
- PostgreSQL-specific domain constraints
- deterministic Nila development seed
- `KLM-001` healthy/on-target scenario
- `KLM-002` needs-attention scenario
- database health endpoint

### Windows / PowerShell bootstrap

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
```

Or, after `.env` and dependencies already exist:

```powershell
npm run db:bootstrap
```

Inspect data with:

```powershell
npm run prisma:studio
```

Full instructions: [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md).

## MVP Modules

1. Dashboard
2. Pond Management
3. Production Cycles
4. Daily Input
5. Sampling & Growth
6. Expenses & Costing
7. Harvest & Sales
8. Alerts / Decision Engine

## Core KPIs

- Survival Rate (SR)
- Mortality Rate
- Average Body Weight (ABW)
- Estimated Population
- Estimated Biomass
- Feed Conversion Ratio (FCR)
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
app/                    Next.js presentation layer
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

**Phase:** Development Database & Backend Foundation  
**Version:** 0.3  
**Database:** local development bootstrap ready  
**Application integration:** next milestone
