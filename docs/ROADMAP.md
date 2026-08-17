# MVP Roadmap — FishFarm Management

Version: 0.1

## Phase 0 — Product Foundation

Status: **IN PROGRESS**

Deliverables:
- [x] product vision
- [x] PRD V0.1
- [x] system architecture V0.1
- [x] domain/data model V0.1
- [x] KPI/formula model V0.1
- [x] Decision Engine model V0.1
- [ ] UI information architecture
- [ ] database schema / ORM model
- [ ] API/use-case contract
- [ ] test strategy

Exit criteria:
- core entity relationships agreed
- formulas have explicit definitions
- projected vs estimated vs actual values are clearly separated
- MVP scope frozen enough to start implementation

---

## Phase 1 — Project Skeleton & Authentication

Goal: deployable application shell.

Deliverables:
- Next.js + TypeScript project
- lint/format configuration
- environment configuration
- PostgreSQL connection
- ORM + migration setup
- authentication
- responsive application shell
- bottom/mobile navigation
- basic design tokens/components

Acceptance:
- user can login
- authenticated page can read/write test data to database
- production/staging deployment works

---

## Phase 2 — Farm, Pond & Cycle Core

Goal: establish the central operational model.

Deliverables:
- farm profile
- pond CRUD
- species seed data
- production cycle CRUD
- cycle status lifecycle
- target configuration
- active cycle validation

Acceptance:
- user can create `KLM-001`
- user can create and activate a Nila cycle with stocking data
- pond detail shows the active cycle
- one pond cannot have conflicting active cycles

---

## Phase 3 — Daily Operations

Goal: make the application useful every day.

Deliverables:
- fast daily input screen
- feeding log
- mortality log
- treatment/probiotic log
- operational notes
- direct expense input
- recent activity timeline

Acceptance:
- typical feed + mortality + note entry can be completed quickly from a phone
- multiple records in one day aggregate correctly
- records are traceable to cycle

---

## Phase 4 — Sampling & Biological KPIs

Goal: turn field sampling into measurable biological performance.

Deliverables:
- sampling form
- ABW calculation
- estimated population
- estimated biomass
- mortality rate
- survival rate
- cumulative feed
- FCR
- growth chart
- SR chart
- FCR chart
- data quality status

Acceptance:
- sample of 30 fish weighing 8.1 kg calculates ABW = 270 g
- biomass uses the latest valid ABW and estimated population
- FCR follows documented biomass-gain formula
- insufficient data never produces fabricated metrics

---

## Phase 5 — Finance, Costing & Harvest

Goal: connect biological performance to business performance.

Deliverables:
- expense categories
- linked operational cost handling
- cumulative cycle cost
- current cost per standing biomass
- projected HPP
- harvest input
- partial harvest
- final harvest
- revenue
- actual HPP
- cycle profit
- margin
- break-even price

Acceptance:
- feed/seed cost cannot be double counted
- partial harvest does not incorrectly reduce SR as mortality
- final cycle can calculate actual HPP from harvested weight
- user can see target vs actual financial performance

---

## Phase 6 — Dashboard V1

Goal: one-screen farm health overview.

Dashboard blocks:
- active ponds
- estimated active population
- estimated biomass
- running cost
- SR
- mortality
- FCR
- projected HPP
- projected margin
- status per pond/cycle
- recent warnings

Acceptance:
- user can identify which pond needs attention without opening every pond
- every dashboard KPI can drill into its source/detail

---

## Phase 7 — Decision Engine V1

Goal: convert KPI deviations into actionable alerts.

Deliverables:
- rules framework
- rule configuration
- data-quality alerts
- mortality alerts
- SR alerts
- FCR alerts
- growth alerts when target curve exists
- HPP/margin alerts
- harvest reminder rules
- alert lifecycle
- ON_TARGET / MONITOR / NEEDS_ATTENTION / INSUFFICIENT_DATA cycle status

Acceptance:
- every alert shows metric, threshold, reason, and recommended check
- alerts do not spam duplicates
- missing/stale data reduces confidence instead of generating false certainty

---

## Phase 8 — Cycle History & Comparison

Goal: make each completed cycle improve the next one.

Deliverables:
- completed-cycle summary
- compare cycles by pond/species
- final SR/FCR/HPP/profit/margin
- cost composition comparison
- growth curve comparison
- cycle duration comparison

Acceptance:
- user can answer which cycle was most efficient and why

---

# MVP Release Definition — V1.0

V1.0 is ready when a farmer can run one complete fish-production cycle entirely in the app:

```text
Create Pond
   ↓
Start Cycle
   ↓
Stock Fish
   ↓
Daily Feed / Mortality / Cost
   ↓
Weekly Sampling
   ↓
Automatic KPIs
   ↓
Alerts
   ↓
Partial / Final Harvest
   ↓
Actual HPP + Profit + Margin
   ↓
Completed Cycle History
```

No spreadsheet should be required for the core workflow.

---

# Post-MVP — V1.x

Candidates, prioritized from real usage:

- water-quality manual logs
- pH / DO / temperature dashboard
- feed inventory
- supplier management
- Telegram alerts
- PWA offline drafts and sync
- multi-user roles
- photos/attachments
- PDF cycle report
- better harvest projection

---

# V2 Candidates

Only after enough reliable operating data exists:

- multi-farm support
- benchmarking
- AI daily farm summary
- cross-cycle anomaly detection
- predictive harvest-date model
- feed planning recommendations
- IoT sensor ingestion
- automated water-quality alerts

AI/ML should be treated as a data maturity milestone, not a launch requirement.

---

# Recommended Next Implementation Order

1. Freeze V0.1 docs after review.
2. Define UI navigation + wireframe screen contract.
3. Convert domain model into PostgreSQL/ORM schema.
4. Write formula unit tests before full dashboard implementation.
5. Build farm/pond/cycle CRUD.
6. Build daily input.
7. Build sampling/KPI engine.
8. Build finance/harvest.
9. Build dashboard.
10. Enable Decision Engine rules.

This sequence ensures the visual dashboard is backed by correct source data rather than mock calculations.
