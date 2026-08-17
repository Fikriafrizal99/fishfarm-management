# Product Requirements Document — FishFarm Management

Version: 0.8  
Status: Active Development  
Primary platform: Mobile-first web application / PWA

## 1. Product Summary

FishFarm Management is one application with two connected but separate operating areas:

1. **Budidaya / Production** — field operations, biological performance, production cost, harvest, and alerts.
2. **Sales CRM** — leads, customers, commercial pipeline, orders, fulfillment, invoices, and payments.

The product replaces fragmented notes and spreadsheets while preserving clear boundaries between biological production data and commercial transactions.

## 2. Product Vision

Create a practical Fish Farm Operating System:

**Record → Monitor → Understand → Act → Harvest → Sell → Collect → Compare → Improve**

## 3. Primary Users

### Production
- owner/operator
- farm manager
- pond/operator staff

### Commercial
- owner
- sales/admin
- finance/admin

MVP may still use one owner user, but schema and application boundaries must not prevent role-based access later.

## 4. Product Goals

### G1 — Complete Production Cycle Record
Every production cycle has traceable stocking, feed, mortality, sampling, costs, harvests, and alerts.

### G2 — Automatic Production KPIs
Users do not manually calculate SR, FCR, biomass, HPP, profit, or margin.

### G3 — Fast Field Input
Routine pond input is mobile-first and fast.

### G4 — Early Problem Visibility
The production dashboard identifies cycles requiring attention.

### G5 — Commercial Pipeline Visibility
The Sales dashboard answers who may buy, what has been ordered, what is committed, and what remains unpaid.

### G6 — Production-to-Sales Traceability
The app can trace fulfilled sales quantity back to harvested source without forcing CRM records to depend on a pond before fulfillment.

### G7 — Historical Learning
Completed cycles and customer transactions can later be compared to improve production and selling decisions.

## 5. Core Domain Boundary Requirement

Production and Sales CRM are separate bounded areas.

Required relationship:

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
      ↑
  Customer
```

### Mandatory Rules

- Lead must not require Pond or ProductionCycle.
- Customer must not require Pond or ProductionCycle.
- Opportunity must not require Pond or ProductionCycle.
- SalesOrder must not require Pond or ProductionCycle.
- A SalesOrder may exist before harvested inventory exists.
- One SalesOrderItem may be fulfilled from several HarvestLots.
- One HarvestLot may serve several SalesOrderItems.
- The bridge is FulfillmentAllocation.

## 6. Non-Goals for Current MVP

- full accounting/GL software
- payroll
- bank reconciliation
- marketplace
- complex warehouse ERP
- IoT automation
- AI disease diagnosis
- automatic pricing optimization
- complex multi-company SaaS tenancy

## 7. Production Modules

### 7.1 Production Dashboard

Must show:
- active ponds
- estimated active fish
- estimated biomass
- running production cost
- SR
- mortality
- FCR
- cycle status
- active alerts

### 7.2 Pond Management

User can eventually:
- create/edit pond
- view active cycle
- view historical cycles

### 7.3 Production Cycle

Minimum lifecycle:
- `PLANNED`
- `ACTIVE`
- `HARVESTING`
- `COMPLETED`
- `CANCELLED`

A pond cannot have conflicting active/harvesting cycles.

### 7.4 Daily Input

Fast input:
- feed
- mortality
- additional production expense
- notes

### 7.5 Sampling & Growth

Records:
- sample count
- total sample weight and/or ABW
- optional average length
- optional observed population
- notes

Calculates:
- ABW
- growth
- ADG
- estimated population
- estimated biomass
- FCR

### 7.6 Production Expenses & Costing

Canonical production-cost ledger: `Expense`.

Cost categories include seed, feed, medicine, probiotic, electricity, water, labor, maintenance, transport, harvest, and other production costs.

### 7.7 Harvest

Harvest is a **production event**, not a CRM order.

Supports:
- partial harvest
- final harvest
- fish count when known
- weight kg
- harvest cost
- notes

V0.8 temporarily retains previous Harvest commercial snapshot fields for compatibility until runtime validation and migration planning are complete.

Each new Harvest must create a HarvestLot.

### 7.8 Decision Engine

Rules-based and explainable.

Current rules include:
- stale sampling
- missing initial biomass
- FCR above target
- SR below target
- harvest date near

Alerts must show reason and recommended check/action.

## 8. Sales CRM Modules

### 8.1 Sales Dashboard

Must be separate from production dashboard.

Initial KPIs:
- open leads
- pipeline value
- confirmed order kg
- confirmed order value
- allocated kg
- available harvested kg
- outstanding receivables
- cash collected this month

### 8.2 Leads

User can record:
- lead title
- source
- contact
- species/product interest optional
- expected demand kg
- expected price/kg
- next follow-up
- notes

Lead lifecycle:

```text
NEW → CONTACTED → QUALIFIED → CONVERTED
                         ↘ LOST
```

### 8.3 Customers

User can record customer/account information:
- name
- customer type
- contact person
- WhatsApp/phone/email
- address
- notes

### 8.4 Opportunities

Qualified commercial pipeline.

Stores:
- customer
- optional originating lead
- expected qty
- expected price
- expected close date
- species/product interest

Dedicated UI is pending after V0.8 validation.

### 8.5 Customer Interaction

Commercial activity history:
- WhatsApp
- call
- meeting
- email
- note

Must reference at least one CRM object: Customer, Lead, or Opportunity.

### 8.6 Sales Orders

Basic V0.8 flow supports one product line per new order UI; data model supports multiple items.

Order fields:
- customer
- species/product
- quantity kg
- agreed price/kg
- requested delivery date
- payment terms
- notes

Lifecycle:
- DRAFT
- CONFIRMED
- PARTIALLY_FULFILLED
- FULFILLED
- CANCELLED

### 8.7 Harvest Inventory

HarvestLot is generated from Harvest.

```text
available kg = lot kg - active allocations
```

No unrelated manual inventory balance should be maintained.

### 8.8 Fulfillment

User selects:
- unfulfilled SalesOrderItem
- available HarvestLot
- allocation kg

Server must reject:
- different farms
- different species
- allocation above remaining order
- allocation above available lot

### 8.9 Delivery

Database model exists in V0.8.

Future write UI must support:
- planned shipment
- dispatched
- delivered
- cancelled
- delivered item quantity

### 8.10 Invoice

Database model exists in V0.8.

Invoice stores billing snapshot and status:
- DRAFT
- ISSUED
- PARTIALLY_PAID
- PAID
- VOID

### 8.11 Payment

Database model exists in V0.8.

Supports multiple payments per invoice for DP/partial/final settlement.

## 9. Key Production User Flows

### Daily Operation

```text
Dashboard
→ Pond
→ Daily Input
→ Save raw records
→ KPI recalculation
→ Decision Engine
→ Dashboard updated
```

### Sampling

```text
Pond
→ Sampling
→ Save sample
→ ABW / Growth / Biomass / FCR updated
→ Alerts reevaluated
```

### Harvest

```text
Pond/Cycle
→ Partial or Final Harvest
→ Harvest saved
→ HarvestLot created
→ production results updated
→ Sales fulfillment inventory becomes available
```

## 10. Key Sales User Flows

### Lead Before Harvest

```text
Lead arrives
→ record Lead
→ follow-up
→ qualify demand
→ create Customer/Opportunity
```

No harvest is required.

### Order Before Harvest

```text
Customer confirms 100 kg Nila
→ SalesOrder CONFIRMED
→ no HarvestLot available yet
→ order remains open
```

This is valid behavior.

### Fulfillment After Harvest

```text
Harvest recorded
→ HarvestLot appears
→ select Order Item
→ allocate HarvestLot quantity
→ allocated/available kg recalculated
```

### Commercial Collection

Future complete flow:

```text
Delivery
→ Invoice
→ DP / Partial Payment
→ Final Payment
→ customer transaction history
```

## 11. Functional Requirements

### Production
- FR-P01 Farm-scoped records
- FR-P02 Pond/cycle lifecycle
- FR-P03 Operational logs
- FR-P04 Sampling
- FR-P05 Production Expense ledger
- FR-P06 Harvest
- FR-P07 KPI recalculation
- FR-P08 Decision alerts
- FR-P09 production history
- FR-P10 KPI traceability

### Sales CRM
- FR-S01 Sales dashboard separated from production dashboard
- FR-S02 Lead recording without production dependency
- FR-S03 Customer recording
- FR-S04 Opportunity model
- FR-S05 SalesOrder before inventory availability
- FR-S06 Harvest creates HarvestLot
- FR-S07 allocation enforces farm/species/quantity integrity
- FR-S08 Delivery model
- FR-S09 Invoice snapshot
- FR-S10 multiple Payments per Invoice
- FR-S11 commercial transactions must not mutate biological KPI formulas

## 12. Non-Functional Requirements

### Mobile Usability
Production daily input and CRM follow-up screens must work well on phone.

### Reliability
- server-side validation
- database constraints
- transactional Harvest + HarvestLot creation
- transactional allocation validation
- deterministic development seed

### Maintainability
- modular application services
- clear production vs CRM namespaces
- documented source-of-truth rules
- migration history before shared deployment

### Security
- server-side authorization when auth is enabled
- no secrets in client bundle
- farm isolation

## 13. Source-of-Truth Rules

### Production
- biological facts: production raw logs
- production costs: Expense
- KPIs: calculated from production raw data

### Sales
- pipeline: Lead/Opportunity
- customer commitment: SalesOrderItem
- sellable harvest stock: HarvestLot
- stock commitment: FulfillmentAllocation
- billing: Invoice
- collection: Payment

### Transition Warning

Until legacy Harvest commercial fields are migrated, reporting must not sum Harvest revenue and Invoice revenue together as if they are independent sales.

## 14. V0.8 Acceptance Scenario

After local validation, the following must work:

```text
1. Open Sales Dashboard.
2. Seeded Hotel lead exists with no production allocation.
3. SO-DEV-001 exists for 100 kg Nila while HarvestLot stock may be zero.
4. Record a new Harvest from production.
5. A HarvestLot is created automatically.
6. Open Fulfillment.
7. Allocate part/all of the lot to the order.
8. Order allocation and lot available kg update correctly.
9. Seeded INV-DEV-001 and Rp500.000 DP produce correct receivable balance.
10. Production SR/FCR/biomass are unchanged by CRM activity.
```

## 15. Validation Gate

Runtime validation remains deferred until a local development machine is available.

Required commands:

```powershell
npm run db:bootstrap
npm run typecheck
npm run build
npm run dev
```

V0.8 cannot be called runtime-stable before this gate passes.

## 16. Future Candidates

Production:
- water quality
- feed inventory/procurement
- supplier management
- offline field sync
- multi-user authorization
- cycle comparison

Commercial:
- Opportunity UI
- lead conversion
- interaction timeline
- delivery write flow
- invoice generation
- payment write flow
- receivable aging
- repeat-order reminders
- price history per customer
- customer profitability
- sales forecast vs projected harvest

Later data-maturity layer:
- AI production summary
- AI CRM summary
- predictive harvest planning
- demand forecasting
- IoT integration
