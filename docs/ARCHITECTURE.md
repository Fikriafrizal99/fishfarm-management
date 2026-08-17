# System Architecture — FishFarm Management

Version: 0.8

## 1. Architecture Goal

Build one mobile-first farm operating system with two explicit business domains:

- **Aquaculture Production**
- **Sales CRM**

The system remains a **modular monolith**. This keeps deployment and development simple while preserving boundaries that prevent production, inventory, and CRM logic from becoming one tangled module.

## 2. High-Level Architecture

```text
[PWA / Mobile Browser]
          |
          v
[Next.js Application]
          |
          +-------------------------------+
          | Production UI                 |
          | Sales CRM UI                  |
          | Server Actions                |
          | Auth / Session later          |
          +-------------------------------+
          |
          v
[Application Service Layer]
          |
          +-- Production
          |    +-- Daily Operations
          |    +-- Sampling & Growth
          |    +-- Costing
          |    +-- Harvest
          |    +-- KPI
          |    +-- Decision Engine
          |
          +-- Sales CRM
               +-- Lead / Customer
               +-- Opportunity
               +-- Sales Order
               +-- Fulfillment
               +-- Delivery
               +-- Invoice / Payment
          |
          v
[PostgreSQL + Prisma]
```

## 3. Critical Domain Boundary

The main architectural rule introduced in V0.8:

```text
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
```

CRM objects above SalesOrderItem do not depend on Pond or ProductionCycle.

This means:
- a Lead can exist with no production capacity assigned,
- a SalesOrder can exist before fish are harvested,
- one order can use several harvest lots,
- one harvest lot can serve several orders.

## 4. Presentation Layer

### Production Area

Routes include:
- `/`
- `/input`
- `/sampling`
- `/ponds/[pondCode]`
- `/harvest`

Responsibilities:
- daily farm operations
- biological KPI visibility
- production finance
- harvest
- alerts

### Sales Area

Routes include:
- `/sales`
- `/sales/leads`
- `/sales/customers`
- `/sales/orders`
- `/sales/fulfillment`

Responsibilities:
- demand/pipeline
- accounts
- orders
- harvested-stock commitment
- receivables summary

Future Sales pages add Opportunity, Delivery, Invoice, and Payment write flows.

## 5. Application Layer

Application services coordinate transactions and validation.

Production examples:

```text
recordDailyInput()
recordSampling()
recordHarvest()
evaluateCycleAlerts()
getPondDetail()
getDashboardOverview()
```

Sales examples:

```text
recordLead()
recordCustomer()
recordSalesOrder()
allocateOrderItem()
getSalesDashboard()
getFulfillmentWorkspace()
```

UI components do not own business calculations or cross-row inventory rules.

## 6. Production Domain

Owns:
- Farm operational context
- Pond
- ProductionCycle
- Stocking
- Feeding
- Mortality
- Sampling
- Treatment
- production Expense
- Harvest
- KPI
- Decision Engine Alert

ProductionCycle remains the primary production analysis unit.

### Production consistency

Raw production events are authoritative.

Derived values include:
- estimated population
- SR
- mortality rate
- ABW
- biomass
- FCR
- current cost/kg
- Actual HPP after final harvest

## 7. Sales CRM Domain

Owns:
- Customer
- Lead
- SalesOpportunity
- CustomerInteraction
- SalesOrder
- SalesOrderItem
- Delivery
- Invoice
- Payment

CRM does not own biological production metrics.

## 8. Integration / Inventory Boundary

### Harvest

Production fact.

### HarvestLot

Sellable-inventory representation created from Harvest.

New Harvest writes create Harvest + HarvestLot in the same database transaction.

### FulfillmentAllocation

Only integration bridge between order demand and harvested supply.

The service validates:
- farm equality
- species equality
- remaining order quantity
- available lot quantity

Available inventory is derived rather than independently edited.

## 9. Financial Boundary

There are two distinct financial contexts.

### Production Cost

Canonical source:

```text
Expense
```

Used for:
- production cost
- HPP
- profit analysis against the chosen commercial revenue source

### Commercial Billing & Collection

Canonical future sources:

```text
Invoice
Payment
```

Do not add Harvest revenue + Invoice revenue together without a transition rule because V0.8 still retains legacy Harvest commercial snapshots for compatibility.

## 10. Transitional Harvest Fields

V0.7 Harvest already includes:
- selling price/kg
- buyer name
- revenue amount

V0.8 keeps them temporarily.

Reason:
- avoid destructive schema change before runtime validation,
- preserve completed-cycle calculations,
- allow explicit migration planning after CRM flow is validated.

Future architecture should settle on CRM as commercial source of truth and define how historical Harvest snapshots are retained.

## 11. Decision Engine Boundary

Decision Engine reads production records and KPIs only.

It does not read lead/order/payment data to redefine biological state.

```text
Production Event
   ↓
KPI Calculation
   ↓
Decision Rules
   ↓
Alert
```

Future business alerts such as overdue invoice reminders should live in a commercial alert/rule module rather than biological Decision Engine rules.

## 12. Persistence Layer

PostgreSQL is the source of truth.

Prisma schema includes both domains in one database while preserving explicit foreign-key boundaries.

Benefits at current scale:
- simple local development
- strongly consistent Harvest + HarvestLot transaction
- strongly consistent order allocations
- one deployment
- easy reporting across domains when intentionally needed

This is not a reason to merge domain logic in application code.

## 13. Offline / Poor Connectivity Direction

Future PWA support:
- cache app shell
- local draft for field input
- sync when online
- client-generated idempotency keys

Production field input has higher offline priority than CRM administration.

## 14. Notifications

Potential adapters:

```text
Production Decision Engine ─┐
                            ├─ Notification Service → App / Telegram / WhatsApp / Push
Commercial Reminder Rules ──┘
```

Notification adapters deliver already-created events; they do not own business rules.

## 15. Security & Audit

- authorization enforced server-side
- never trust calculated client values
- decimal-safe persisted money
- transactional fulfillment allocation
- completed production and commercial records should be auditable
- secrets stay in environment variables
- migration history is version controlled before staging/production

## 16. Scaling Strategy

Do not split into microservices now.

Potential extraction only when justified:
1. notification worker
2. reporting/analytics worker
3. IoT ingestion
4. AI advisory/summarization

Production, inventory allocation, invoice, and payment transactions should remain strongly consistent.

## 17. AI Boundary

AI may later summarize:
- farm condition
- multiple alerts
- customer pipeline
- overdue follow-up
- completed-cycle/commercial history

AI cannot silently redefine:
- FCR/SR/HPP formulas
- inventory allocation
- invoice values
- payment balances
