# Sales CRM — FishFarm Management

Version: 0.8

## 1. Purpose

Sales CRM is a separate commercial domain from aquaculture production.

Production answers:
- what fish are being grown,
- where they are grown,
- biological performance,
- production cost,
- what was harvested.

Sales CRM answers:
- who may buy,
- what demand exists,
- what has been ordered,
- how many kilograms are committed,
- what has been delivered,
- what has been invoiced,
- what has been paid.

The domains are integrated but intentionally **loosely coupled**.

## 2. Boundary

```text
PRODUCTION                         SALES CRM

Pond                               Lead
  ↓                                  ↓
ProductionCycle                    Customer
  ↓                                  ↓
Harvest                            Opportunity
  ↓                                  ↓
HarvestLot      ← bridge →        SalesOrder
                    ↓                 ↓
            FulfillmentAllocation    SalesOrderItem
                    ↓
                 Delivery
                    ↓
                  Invoice
                    ↓
                  Payment
```

`Lead`, `Customer`, `Opportunity`, and `SalesOrder` never need a direct pond or production-cycle reference.

The commercial-to-production link is created only when physical harvested stock is allocated.

## 3. Why HarvestLot + FulfillmentAllocation

A `Harvest` is a production fact. A `HarvestLot` represents sellable harvested inventory.

Example:

```text
KLM-001 harvest = 800 kg
HarvestLot HL-001 = 800 kg

SO-001 / Restaurant A = 100 kg
SO-002 / Wholesaler B = 300 kg

HL-001 → SO-001 = 100 kg
HL-001 → SO-002 = 300 kg

Available = 400 kg
```

One order can also use several harvest lots:

```text
SO-010 = 500 kg Nila

HL-KLM001 → 300 kg
HL-KLM003 → 200 kg
```

Therefore:

```text
available_kg = harvest_lot.quantity_kg - sum(active fulfillment allocations)
```

Available inventory is derived; it is not maintained as an unrelated second stock number.

## 4. Core CRM Entities

### Customer

Known buyer / account.

Typical customer types:
- restaurant
- wholesaler / pengepul
- retailer
- market
- hotel
- catering
- individual
- other

Main fields:
- name
- customer type
- contact person
- phone / WhatsApp / email
- address
- notes
- active status

### Lead

Potential buyer or incoming demand that has not necessarily become an order.

Main fields:
- title
- status
- source
- contact information
- optional species/product interest
- expected demand kg
- expected price/kg
- next follow-up
- notes

Lead status:

```text
NEW → CONTACTED → QUALIFIED → CONVERTED
                         ↘ LOST
```

### Opportunity

Qualified commercial opportunity.

It may exist before a matching harvest exists.

Main fields:
- customer
- optional originating lead
- opportunity title
- species/product interest
- expected quantity
- expected selling price
- expected close date
- status

### CustomerInteraction

CRM activity history:
- WhatsApp
- call
- meeting
- email
- note

Can also store the next follow-up date.

### SalesOrder

Commercial commitment from a customer.

A SalesOrder is **not** a Harvest and does not directly own a pond/cycle.

Lifecycle:

```text
DRAFT → CONFIRMED → PARTIALLY_FULFILLED → FULFILLED
   ↘ CANCELLED
```

### SalesOrderItem

Requested product/species, quantity kg, and agreed price/kg.

### HarvestLot

Sellable quantity originating from one Harvest event.

Production traceability remains available through:

```text
HarvestLot → Harvest → ProductionCycle → Pond
```

Sales code does not need to depend on Pond directly.

### FulfillmentAllocation

Bridge between a SalesOrderItem and HarvestLot.

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

This is the only point where commercial demand becomes tied to a specific harvested source.

Allocation status:
- RESERVED
- FULFILLED
- CANCELLED

### Delivery

Physical shipment / hand-over to customer.

### Invoice

Billing snapshot for an order. Invoice totals are stored so later edits to the source order cannot silently rewrite historical billing.

### Payment

Cash receipt against invoice. Multiple payments allow DP, partial payment, and settlement.

## 5. Sales Dashboard

Sales has its own dashboard separate from farm operations.

Initial KPIs:
- open leads
- qualified pipeline value
- confirmed order value
- confirmed order kg
- committed / allocated kg
- available harvested kg
- outstanding receivables
- payments / sales collected this month

Pipeline value can initially use:

```text
expected_qty_kg × expected_price_per_kg
```

Only when both values exist.

## 6. Navigation

Suggested top-level mobile navigation:

```text
Dashboard | Budidaya | Sales | Alert | Lainnya
```

Sales area:

```text
Sales Dashboard
├── Leads
├── Customers
├── Pipeline
├── Orders
├── Fulfillment
├── Deliveries
├── Invoices
└── Payments
```

Production forms remain outside Sales.

## 7. Source-of-truth Rules

- Production cost source of truth remains `Expense`.
- Biological harvest source of truth remains `Harvest`.
- Sellable harvested inventory is represented by `HarvestLot`.
- Customer demand source of truth is `SalesOrderItem` once an order is confirmed.
- Physical source commitment is `FulfillmentAllocation`.
- Billing source of truth is `Invoice`.
- Cash collection source of truth is `Payment`.
- Customer/lead pipeline must not change production KPI formulas.

## 8. Transitional Harvest Fields

V0.7 already stores `buyer_name`, `selling_price_per_kg`, and `revenue_amount` on Harvest.

V0.8 does **not** remove these fields yet because doing so would break the existing farming-cycle flow before runtime validation.

Transition strategy:

1. retain the legacy harvest commercial snapshot,
2. introduce CRM as the future commercial source of truth,
3. connect harvested stock using HarvestLot/FulfillmentAllocation,
4. validate the end-to-end workflow,
5. only then decide whether Harvest sale fields become optional legacy snapshots or are migrated into Sales transactions.

This avoids a premature destructive migration.

## 9. V0.8 Scope

V0.8 foundation includes:
- CRM database model
- separate Sales dashboard
- lead/customer/order application services
- HarvestLot inventory bridge
- fulfillment allocation model
- invoice/payment data model
- development seed for CRM scenarios

Runtime validation is intentionally deferred to the same local validation gate as the rest of the current remote implementation.

## 10. Future Extensions

After real usage:
- lead conversion action
- repeat-order reminders
- overdue invoice alert
- customer profitability
- price history per customer
- sales forecast
- demand vs projected harvest capacity
- WhatsApp interaction integration
- quotation document/PDF
- delivery proof/photo
- returns/claims
