# FishFarm Management

Mobile-first aquaculture farm management system for recording pond operations, biological performance, production cost, harvest outcomes, and actionable farm decisions.

## Vision

Turn daily fish-farming records into a simple operating system for farmers: **record → measure → detect → decide → improve**.

The first version is intentionally not AI-first. Core calculations and alerts are deterministic and explainable. AI can be added later after enough real farm-cycle data exists.

## UI Concept

![FishFarm Management UI concept](docs/assets/fishfarm-ui-concept.svg)

The mockup above is the initial visual direction for Dashboard, Pond Detail, Daily Input, and Finance & Harvest. See [`docs/UI_REFERENCE.md`](docs/UI_REFERENCE.md) for screen behavior and implementation guidance.

## Current Application Flow — V0.7

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

The application does not substitute hardcoded KPI values when PostgreSQL is unavailable. The UI shows an explicit unavailable/empty state instead.

## Development Database

The repository includes a repeatable local development environment:

- PostgreSQL 17 in Docker Compose
- Prisma schema and generated-client workflow
- PostgreSQL-specific domain constraints
- deterministic Nila development seed
- `KLM-001` healthy/on-target scenario
- `KLM-002` monitoring scenario
- database health endpoint
- automatic initial Decision Engine evaluation during bootstrap

### Windows / PowerShell bootstrap

```powershell
Copy-Item .env.example .env
npm install
./scripts/dev-db.ps1
npm run dev
```

Or after `.env` and dependencies exist:

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

Full database instructions: [`docs/DEVELOPMENT_DATABASE.md`](docs/DEVELOPMENT_DATABASE.md).

## Implemented Modules

### Dashboard — `/`

Reads active cycles from PostgreSQL and calculates:

- active pond count
- estimated active fish population
- estimated standing biomass
- running production cost
- estimated survival rate
- mortality rate
- FCR based on biomass gain
- current cost per estimated standing kg
- alert-driven pond status

Status contract:

```text
no WARNING/ACTION_REQUIRED + metrics available → ON TARGET
WARNING                                   → MONITOR
ACTION_REQUIRED                           → NEEDS ATTENTION
```

### Daily Input — `/input`

Writes operational raw data:

- feed quantity
- mortality quantity
- additional operating expense
- expense category
- notes

Feed input creates a linked canonical Expense transaction when feed unit cost is available, preventing duplicate costing.

After a successful write, the Decision Engine reevaluates the cycle. A Decision Engine failure is logged separately and does not roll back an already-successful raw operational write.

### Sampling & Growth — `/sampling`

Writes biological sampling data:

- sample count
- total sample weight
- observed/direct ABW
- average length
- optional observed population
- notes

The server derives ABW from total sample weight when needed. If both total sample weight and ABW are entered, the values are checked for reasonable consistency.

Sampling updates drive:

- ABW
- weight gain
- ADG
- standing biomass
- biomass-gain FCR
- Decision Engine rules

### Pond Detail — `/ponds/[pondCode]`

Displays the active or latest cycle for one pond:

- stocked / current population context
- SR and mortality
- ABW and growth history
- ADG
- estimated standing biomass
- cumulative feed and FCR
- cost breakdown
- target harvest progress
- active alerts
- direct actions for Daily Input, Sampling, and Harvest

### Harvest & Sales — `/harvest`

Supports:

- partial harvest
- final harvest
- harvested kg
- optional harvested fish count
- selling price per kg
- buyer
- harvest cost
- notes

Lifecycle behavior:

```text
PARTIAL → cycle status HARVESTING
FINAL   → cycle status COMPLETED
```

When a cycle is completed, Pond Detail switches from current estimates to final-result metrics where data supports them:

- harvested biomass
- revenue
- Actual HPP/kg
- net profit
- margin
- Final FCR
- Final SR only when fish counts across harvest records are complete

The application intentionally does not fabricate Final SR from harvest weight alone.

## Live Decision Engine

V0.7 implements the first deterministic rule lifecycle.

Initial live rules:

- `DQ_SAMPLING_STALE`
- `DQ_INITIAL_BIOMASS_MISSING`
- `FCR_ABOVE_TARGET`
- `SR_BELOW_TARGET`
- `HARVEST_DATE_NEAR`

Default rule configuration is centralized in:

```text
src/domain/decision/config.ts
```

FCR follows the documented relative thresholds:

```text
>= target × 1.10 → WARNING
>= target × 1.20 → ACTION_REQUIRED
```

The engine updates an existing alert for the same cycle/rule instead of intentionally creating a new alert every time. When a condition no longer applies, active engine alerts move to `RESOLVED`.

Bootstrap runs:

```text
npm run decision:evaluate
```

after seed data, replacing legacy development alerts with live rule output.

## MVP Module Status

1. Dashboard — **DB-backed**
2. Pond Management — **detail/read path implemented**
3. Production Cycles — **lifecycle read + harvest transitions implemented**
4. Daily Input — **write flow implemented**
5. Sampling & Growth — **write + trend implemented**
6. Expenses & Costing — **canonical ledger + cycle breakdown implemented**
7. Harvest & Sales — **partial/final write flow implemented**
8. Alerts / Decision Engine — **live V1 rule lifecycle implemented**

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
- Current Cost per Estimated Standing kg
- Actual HPP/kg for completed cycles
- Revenue
- Net Profit
- Margin
- Cycle Duration
- Harvest Progress

## Product Principles

- mobile-first and field-friendly
- PostgreSQL is the source of truth, not spreadsheets
- every important KPI must trace back to raw records
- operational, biological, and financial data are connected by production cycle
- observed, estimated, projected, and final values must not be conflated
- alerts must explain why they fired
- no disease diagnosis from generic rule alerts
- historical cycles must remain auditable
- AI is a later interpretation layer, not a replacement for formulas

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
app/                    Next.js pages + server actions
src/application/        use cases, transactions, query services, alert lifecycle
src/domain/             KPI formulas and deterministic decision rules
src/lib/                infrastructure helpers
prisma/                 schema + deterministic seed
scripts/                DB helpers + Decision Engine runner
docs/                   product and architecture documentation
```

## Validation Status

The code has been structured and committed remotely, but the current session cannot run your local Docker/Node environment.

When a laptop is available, the required validation gate before calling V0.7 runtime-stable is:

```powershell
git pull
npm install
npm run db:bootstrap
npm run typecheck
npm run build
npm run dev
```

Then test these flows end-to-end:

```text
Dashboard
→ Daily Input
→ Sampling
→ Pond Detail
→ Partial Harvest
→ Final Harvest
→ Decision alert trigger / update / resolution
```

## Status

**Version:** 0.7  
**Phase:** Core Farming Cycle + Live Decision Engine  
**Code:** implemented remotely  
**Runtime validation:** pending local Docker/Node execution  
**Next after validation:** alert acknowledgement UI, completed-cycle history/comparison, projected HPP/margin, and refinement of rule configuration
