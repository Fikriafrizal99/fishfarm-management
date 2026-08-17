# System Architecture — FishFarm Management

Version: 0.1

## 1. Architecture Goal

Build a mobile-first farm operating system that connects daily field input, biological performance, financial performance, harvest outcomes, and explainable operational alerts.

The first implementation uses a **modular monolith**. This is intentionally simpler than microservices while keeping domain boundaries explicit enough to split later if scale requires it.

## 2. High-Level Architecture

```text
[PWA / Mobile Browser]
        |
        v
[Next.js Web Application]
        |
        +-----------------------------+
        | UI / Forms / Dashboard      |
        | Auth / Session              |
        | API / Server Actions        |
        +-----------------------------+
        |
        v
[Application Service Layer]
        |
        +-- Farm & Pond Service
        +-- Cycle Service
        +-- Daily Operation Service
        +-- Sampling & Growth Service
        +-- Costing Service
        +-- Harvest Service
        +-- KPI Calculation Service
        +-- Decision Engine
        +-- Notification Service
        |
        v
[PostgreSQL]
        |
        +-- master data
        +-- transactional logs
        +-- cycle snapshots
        +-- KPI snapshots
        +-- alerts
```

## 3. Architectural Layers

### Presentation Layer

Responsibilities:
- mobile-first dashboard
- pond and cycle views
- daily input forms
- sampling form
- expense form
- harvest form
- alerts and explanations
- historical cycle comparison

The interface must work well on a phone before desktop optimization.

### Application Layer

Coordinates use cases without embedding database-specific logic in UI components.

Examples:
- `createProductionCycle()`
- `recordDailyFeeding()`
- `recordMortality()`
- `recordSampling()`
- `recordExpense()`
- `closeCycleWithHarvest()`
- `recalculateCycleMetrics()`
- `evaluateCycleAlerts()`

### Domain Layer

Contains business concepts and rules:
- farm
- pond
- species
- production cycle
- stocking
- feed
- mortality
- sampling
- biomass
- expenses
- harvest
- KPI
- alerts

Core formulas belong here or in a dedicated calculation module, not directly inside UI components.

### Persistence Layer

PostgreSQL is the source of truth. Spreadsheet storage is explicitly out of scope.

All operational records should have:
- stable ID
- farm/cycle relationship
- event date/time
- created timestamp
- creator/user ID when multi-user support exists

## 4. Domain Boundaries

### Farm Management
Owns farms, ponds, pond metadata, and operational status.

### Production Cycle
Owns stocking, start/end dates, target harvest, cycle status, and cycle lifecycle.

### Operations
Owns daily feed, mortality, treatment/probiotic use, notes, and routine activities.

### Biology
Owns sampling, average body weight, population estimate, biomass estimate, growth trend, and survival metrics.

### Finance
Owns expense categories, production cost, HPP, revenue, profit, margin, and break-even calculations.

### Harvest
Owns partial/final harvest events, harvested quantity, weight, selling price, buyer, and revenue.

### Decision Engine
Reads facts from other domains but does not own their source records. It produces explainable alerts and recommendations.

## 5. Recommended Technology Baseline

### Frontend
- Next.js
- TypeScript
- responsive PWA
- component-based design system
- chart library for KPI trends

### Backend
Start inside the same Next.js project using server-side modules/API routes/server actions. Domain and service modules must remain framework-light so extraction is possible later.

### Database
- PostgreSQL
- Prisma or Drizzle ORM
- migrations committed to repository

### Authentication
MVP:
- one owner/admin account is sufficient for initial personal/farm use

Later:
- owner
- manager
- operator
- viewer

### Deployment
Prefer managed services for V1:
- web/PWA hosting
- managed PostgreSQL
- object storage only when photos/documents are introduced

## 6. Data Flow Example — Daily Feeding

```text
User opens KLM-001
      |
      v
Input 18 kg feed
      |
      v
Validation
- cycle ACTIVE?
- feed amount > 0?
- date valid?
      |
      v
Save feeding_log
      |
      v
Recalculate
- cumulative feed
- projected feed cost
- current FCR if biomass data exists
- projected HPP
      |
      v
Decision Engine
      |
      +-- NORMAL
      +-- WARNING
      +-- ACTION_REQUIRED
      |
      v
Dashboard updated
```

## 7. Calculation Strategy

Never overwrite raw logs to store calculated values.

Use three categories of data:

1. **Raw facts** — feed, mortality, sampling, expenses, harvest.
2. **Derived metrics** — SR, FCR, biomass, HPP, margin.
3. **Snapshots** — optional stored KPI state at a point in time for performance/history.

Every KPI shown to the user must be reproducible from raw facts plus documented formulas.

## 8. Offline / Poor Connectivity Direction

Not required for first coding milestone, but architecture should avoid blocking it.

Future PWA behavior:
- cache application shell
- allow local draft of field input
- sync when online
- prevent duplicate submissions with client-generated idempotency keys

## 9. Notification Architecture

V1: alerts visible inside the app.

Later adapters:

```text
Decision Engine
      |
      v
Notification Service
  |      |      |
 App  Telegram WhatsApp/Push
```

Notification channels must not contain business logic; they only deliver alerts created by the engine.

## 10. Security & Audit Principles

- validate authorization server-side
- never trust calculated values sent from client
- money calculations use decimal-safe types
- historical harvest/financial records should be auditable
- destructive changes require explicit confirmation
- secrets stay in environment variables
- database migrations are version controlled

## 11. Scaling Strategy

Do not start with microservices.

Possible future extraction order only when justified:
1. notification worker
2. analytics/reporting worker
3. IoT ingestion service
4. AI advisory service

Core farm/cycle transactions should remain strongly consistent.

## 12. Non-Goals for MVP

- IoT sensors
- camera-based fish counting
- automatic disease diagnosis
- machine-learning feed optimization
- accounting/ERP replacement
- marketplace integration
- complex multi-company tenancy

These can be evaluated only after the operational data model is stable.
