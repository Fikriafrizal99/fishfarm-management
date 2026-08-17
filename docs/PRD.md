# Product Requirements Document — FishFarm Management

Version: 0.1  
Status: Foundation  
Primary platform: Mobile-first web application / PWA

## 1. Product Summary

FishFarm Management is an application for managing fish-farming operations by production cycle. It replaces fragmented notes and spreadsheets with a single application that records field activity, calculates biological and financial KPIs, monitors pond performance, and surfaces explainable alerts.

## 2. Problem

Small and growing fish farms commonly have operational data but lack one connected system that answers:

- How much has each pond consumed in feed?
- How many fish are estimated to remain alive?
- Is growth still on target?
- Is FCR becoming inefficient?
- What is the real cost of production per kilogram?
- What selling price is needed to break even?
- Which pond needs attention today?
- Which production cycle actually performed best?

The product should make these answers available without requiring manual spreadsheet formulas.

## 3. Product Vision

Create a practical **Fish Farm Operating System** where a farmer can:

**Record → Monitor → Understand → Act → Compare → Improve**

## 4. Target User

### MVP Primary User
Farm owner/operator managing one or several ponds and entering operational data directly from a phone.

### Future Users
- farm manager
- pond/operator staff
- finance/admin staff
- investor/owner viewer

## 5. Product Goals

### G1 — Complete Cycle Record
Every active production cycle has traceable stocking, feeding, mortality, sampling, cost, and harvest records.

### G2 — Automatic KPI Calculation
Users do not manually calculate SR, FCR, HPP, margin, biomass, or revenue.

### G3 — Fast Field Input
Common daily records should be possible in under a minute on a phone.

### G4 — Early Problem Visibility
The dashboard highlights ponds/cycles requiring attention.

### G5 — Cycle Learning
Completed cycles can be compared to improve operational decisions over time.

## 6. Non-Goals for MVP

- full accounting software
- payroll
- inventory ERP
- IoT automation
- AI disease diagnosis
- feed purchasing marketplace
- automatic bank reconciliation
- complex multi-tenant SaaS billing

## 7. MVP Modules

### 7.1 Dashboard

Must show:
- active ponds
- active fish estimate
- estimated biomass
- running production cost
- average or selected-cycle SR
- mortality
- FCR
- estimated HPP
- estimated margin
- pond/cycle health status
- recent alerts

Dashboard must allow the user to enter the pond/cycle detail page.

### 7.2 Pond Management

User can:
- create pond
- edit pond metadata
- activate/deactivate pond
- view current cycle
- view previous cycles

Minimum fields:
- pond code
- pond name
- length
- width
- depth/volume when available
- pond type/system
- notes

### 7.3 Production Cycle

User can create a new production cycle for a pond.

Minimum fields:
- pond
- species
- stocking date
- stocking quantity
- seed average weight or size when available
- seed unit cost / total seed cost
- target harvest date
- target harvest weight
- target SR
- target FCR
- target HPP
- target selling price

Status:
- PLANNED
- ACTIVE
- HARVESTING
- COMPLETED
- CANCELLED

A pond cannot have more than one ACTIVE cycle in MVP.

### 7.4 Daily Input

Fast input screen for an active cycle.

MVP records:
- feed quantity
- mortality count
- medicine/probiotic cost or treatment
- operational expense
- note

User may record multiple events per day. The system aggregates them automatically.

### 7.5 Sampling & Growth

User can record sampling event:
- date
- number of sampled fish
- total sample weight or average weight
- optional length
- note

System calculates:
- ABW
- estimated live population
- estimated biomass
- growth trend
- latest cycle biomass estimate

### 7.6 Expenses & Costing

Expense categories:
- seed
- feed
- medicine
- probiotic
- electricity
- water
- labor
- maintenance
- transport
- other

Every expense must be attributable to a cycle where relevant.

System calculates:
- cumulative production cost
- feed cost share
- estimated HPP
- actual HPP after harvest

### 7.7 Harvest & Sales

Supports partial and final harvest.

Fields:
- harvest date
- harvested fish count if known
- harvest weight
- selling price per kg
- buyer/customer optional
- additional harvest cost optional
- notes

System calculates:
- revenue
- cumulative harvested weight
- realized average selling price
- profit
- margin
- final FCR
- final SR when valid population data is available

Final harvest can close the cycle.

### 7.8 Decision Engine / Alerts

V1 is deterministic and rules-based.

Examples:
- mortality spike
- FCR above target
- growth below target
- HPP above target
- projected margin below threshold
- missing sampling data
- harvest target approaching

Each alert must include:
- severity
- metric/value
- threshold/target
- reason
- recommended check/action

## 8. Key User Flows

### Flow A — Start First Cycle
1. Register/login
2. Create farm profile
3. Create pond
4. Create cycle
5. Enter stocking data
6. Dashboard shows active cycle

### Flow B — Daily Operation
1. Open app
2. Select active pond
3. Tap Input
4. Record feed/mortality/cost/note
5. Save
6. KPI and alerts refresh

### Flow C — Weekly Sampling
1. Select pond
2. Add sampling
3. Enter sample count and weight
4. Save
5. System updates ABW, biomass, growth curve, FCR projection

### Flow D — Harvest
1. Select cycle
2. Add harvest
3. Enter weight and price
4. Save
5. System updates revenue/profit
6. If final harvest, complete cycle and freeze final KPI summary

## 9. Functional Requirements

### FR-01 Authentication
User must be authenticated to access farm data.

### FR-02 Farm Isolation
All records must belong to a farm/user scope.

### FR-03 Pond Lifecycle
A user can create, edit, list, and archive ponds.

### FR-04 Cycle Lifecycle
A user can plan, activate, harvest, and complete a cycle.

### FR-05 Operational Logs
A user can create timestamped feeding, mortality, treatment, and note records.

### FR-06 Sampling
A user can create sampling records and see derived biological metrics.

### FR-07 Financial Logs
A user can record expenses and see cumulative cost.

### FR-08 Harvest
A user can record one or more harvest events.

### FR-09 KPI Recalculation
Relevant cycle KPIs update after dependent records change.

### FR-10 Alerts
The system evaluates rules after meaningful events and exposes active alerts.

### FR-11 History
Completed cycles remain available for comparison.

### FR-12 Traceability
Derived KPIs must be traceable to source records.

## 10. Non-Functional Requirements

### Performance
- common dashboard should load quickly on typical mobile connections
- daily save action should feel immediate

### Usability
- primary daily input must be one-hand mobile friendly
- Indonesian is the default language in MVP
- numbers and currency use Indonesian formatting

### Reliability
- duplicate save protection
- server-side validation
- safe database migrations

### Security
- authenticated access
- server-side authorization
- secrets never stored in frontend bundle

### Maintainability
- TypeScript
- modular domain services
- automated tests for formulas
- documented migrations and KPI definitions

## 11. Success Metrics for MVP

Product success is not measured by number of screens.

Initial indicators:
- ≥ 90% of farm activity for a cycle can be captured in-app
- daily input median completion time < 60 seconds
- zero manual spreadsheet calculations needed for core KPIs
- completed cycle has final cost, HPP, revenue, profit, SR, and FCR where source data permits
- alerts can be explained from visible source metrics

## 12. MVP Acceptance Scenario

A user creates `KLM-001`, starts a Nila cycle with 3,000 fish, records daily feed/mortality/expenses, performs weekly sampling, and finishes harvest at 810 kg.

Without external calculation, the app must be able to show:
- current/final estimated population
- SR
- mortality
- cumulative feed
- FCR
- latest ABW
- biomass
- total cost
- HPP/kg
- revenue
- net profit
- margin
- cycle duration
- target vs actual status
- alerts generated during the cycle

## 13. Post-MVP Candidates

- feed inventory
- supplier management
- water quality logs
- pH / DO / temperature tracking
- Telegram alerts
- photo attachments
- offline sync
- multi-user roles
- multi-farm support
- cycle benchmarking
- AI narrative summaries
- harvest prediction model
- IoT integrations
