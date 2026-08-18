# Sales CRM — FishFarm Management

Version: **0.9**

## 1. Purpose

Sales CRM is the commercial domain of FishFarm Management. It answers:

- who may buy,
- what demand is qualified,
- what has been ordered,
- which harvested stock is committed,
- what has actually been delivered,
- what has been invoiced,
- what has been paid.

Production and commercial data remain **loosely coupled**.

## 2. Domain Boundary

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

`Lead`, `Customer`, `Opportunity`, and `SalesOrder` never need a direct Pond or ProductionCycle reference.

Physical traceability exists through:

```text
SalesOrderItem
      ↓
FulfillmentAllocation
      ↓
HarvestLot
      ↓
Harvest
      ↓
ProductionCycle
      ↓
Pond
```

## 3. CRM Lifecycle — V0.9

### Acquisition

```text
Lead → Opportunity → Sales Order
```

Rules:

- Lead can exist without Customer, stock, pond, or harvest.
- Creating Opportunity requires a known Customer.
- When an Opportunity is created from a Lead, the Lead becomes `QUALIFIED` and is linked to the chosen Customer.
- Opportunity starts as `OPEN`.
- Converting an OPEN Opportunity into Sales Order changes Opportunity to `WON`.
- If the Opportunity originated from a Lead, that Lead becomes `CONVERTED`.
- Opportunity may be marked `LOST` only when it has no Sales Order.

### Supply Commitment

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

Rules:

- allocation quantity must not exceed remaining order quantity,
- allocation quantity must not exceed available HarvestLot quantity,
- species and farm must match,
- active allocation consumes HarvestLot availability,
- allocation begins fulfillment but does **not** mean the product has been delivered.

### Delivery

```text
PLANNED → DISPATCHED → DELIVERED
    ↘ CANCELLED
```

Rules:

- only quantity already covered by active FulfillmentAllocation can be scheduled,
- planned/dispatched Delivery reserves the allocated delivery quantity so it cannot be scheduled twice,
- only `DELIVERED` quantity counts as actual delivered quantity,
- Sales Order becomes `PARTIALLY_FULFILLED` when allocation/delivery activity starts,
- Sales Order becomes `FULFILLED` only when requested quantity is actually delivered,
- corresponding FulfillmentAllocation becomes `FULFILLED` when delivered quantity covers its active allocation.

### Billing

Invoice is a historical billing snapshot.

Rules:

- Invoice may be created against a non-cancelled Sales Order,
- subtotal cannot exceed the uninvoiced order value,
- blank subtotal means invoice the full remaining uninvoiced order value,
- `adjustmentAmount` may represent an additional charge or discount,
- total invoice may not be negative,
- issued invoices start as `ISSUED`,
- invoice with payments cannot be `VOID`.

### Collection

```text
ISSUED → PARTIALLY_PAID → PAID
```

Rules:

- Payment must reference one Invoice,
- payment amount must be positive,
- payment cannot exceed outstanding invoice balance,
- partial collection sets Invoice to `PARTIALLY_PAID`,
- full collection sets Invoice to `PAID`,
- multiple Payment rows support DP / cicilan / settlement.

## 4. Core Entities

### Customer

Known commercial account / buyer.

### Lead

Incoming potential buyer or demand.

Status:

```text
NEW → CONTACTED → QUALIFIED → CONVERTED
                         ↘ LOST
```

### Opportunity

Qualified demand forecast attached to a Customer.

Status:

```text
OPEN → WON
   ↘ LOST
```

Pipeline value:

```text
expected_qty_kg × expected_price_per_kg
```

when both values exist.

### SalesOrder / SalesOrderItem

Commercial commitment and requested product quantity/price.

### HarvestLot

Sellable harvested stock originating from one production Harvest.

### FulfillmentAllocation

Only integration boundary between commercial demand and physical harvested source.

### Delivery

Physical shipment / hand-over record.

### Invoice

Stored billing snapshot with subtotal, adjustment, and total.

### Payment

Cash receipt against Invoice.

## 5. Source-of-Truth Rules

- production cost → `Expense`
- biological harvest → `Harvest`
- sellable harvested inventory → `HarvestLot`
- qualified demand → `SalesOpportunity`
- confirmed customer demand → `SalesOrderItem`
- physical source commitment → `FulfillmentAllocation`
- physical hand-over → `Delivery` + `DeliveryItem`
- billing → `Invoice`
- cash collection → `Payment`

CRM data must not change biological KPI formulas.

## 6. Sales Navigation — V0.9

```text
Sales Overview
├── Leads
├── Customers
├── Pipeline
├── Orders
├── Fulfillment
├── Delivery
├── Invoice
└── Payment
```

Routes:

- `/sales`
- `/sales/leads`
- `/sales/customers`
- `/sales/pipeline`
- `/sales/orders`
- `/sales/fulfillment`
- `/sales/deliveries`
- `/sales/invoices`
- `/sales/payments`

## 7. Dashboard KPIs

- open leads
- OPEN opportunity pipeline value
- active order kg/value
- allocated kg
- available harvested kg
- outstanding receivables
- cash collected this month

Completed orders can leave the active-order widget while remaining fully auditable in Sales Order history.

## 8. Transitional Harvest Commercial Fields

Legacy Harvest fields remain:

- `buyer_name`
- `selling_price_per_kg`
- `revenue_amount`

They are compatibility snapshots from the production flow. They are not used as replacements for Customer, SalesOrder, Invoice, or Payment records.

## 9. V0.9 Application Services

Commercial write/read logic lives in the application layer:

- `record-lead.ts`
- `record-customer.ts`
- `record-opportunity.ts`
- `record-sales-order.ts`
- `allocate-order-item.ts`
- `record-delivery.ts`
- `record-invoice.ts`
- `record-payment.ts`
- `sync-order-fulfillment-status.ts`
- `get-sales-dashboard.ts`
- `get-sales-lists.ts`
- `get-fulfillment-workspace.ts`
- `get-commercial-workspaces.ts`

Cross-row commercial balances are validated in these services because they depend on current transactional state.

## 10. Development Scenario

Seed data keeps pipeline semantics consistent:

- Opportunity linked to `SO-DEV-001` is `WON`.
- A separate Opportunity for Pengepul Nila Cianjur remains `OPEN` for Pipeline → Order testing.
- `INV-DEV-001` remains `PARTIALLY_PAID` with Rp500.000 DP.
- No HarvestLot allocation is seeded, so Fulfillment/Delivery can be tested after a real development Harvest is entered.

## 11. Runtime Validation Gate

V0.9 is implemented remotely but must pass local validation:

```text
Lead / existing Customer
→ Opportunity
→ Order conversion
→ Harvest
→ HarvestLot
→ Fulfillment allocation
→ Delivery PLANNED
→ DISPATCHED
→ DELIVERED
→ Invoice
→ partial Payment
→ final Payment
→ Dashboard reconciliation
```

Do not call V0.9 runtime-stable until this flow passes `typecheck`, production build, and local transaction testing.

## 12. Future Extensions

- quotations / quotation PDF
- lead conversion that can create Customer automatically
- customer price history
- repeat-order reminders
- overdue invoice alerts
- customer profitability
- delivery proof/photo
- returns / claims
- demand vs projected harvest capacity
- WhatsApp interaction integration
