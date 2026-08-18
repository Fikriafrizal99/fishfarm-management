# Sales CRM — FishFarm Management

Version: **0.11**

## 1. Purpose

Sales CRM is the commercial domain of FishFarm Management. It answers:

- who may buy,
- what demand is qualified,
- what has been ordered,
- which harvested stock is committed,
- what has actually been delivered,
- what has been invoiced,
- what has been paid,
- what receivable is overdue.

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

Physical traceability remains:

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

## 3. Lifecycle Rules

### Acquisition

```text
Lead → Opportunity → Sales Order
```

- Lead can exist before stock or harvest exists.
- Opportunity requires a Customer.
- Lead used for Opportunity becomes `QUALIFIED`.
- Opportunity starts `OPEN`.
- Conversion to Sales Order changes Opportunity to `WON` and originating Lead to `CONVERTED`.
- Opportunity can become `LOST` only when no Sales Order exists.

### Supply Commitment

```text
SalesOrderItem ← FulfillmentAllocation → HarvestLot
```

- allocation cannot exceed remaining order quantity,
- allocation cannot exceed available HarvestLot quantity,
- farm and species must match,
- allocation reserves supply but is not proof of delivery.

### Delivery

```text
PLANNED → DISPATCHED → DELIVERED
    ↘ CANCELLED
```

- only allocated quantity can be scheduled,
- planned/dispatched quantity cannot be double-booked,
- only `DELIVERED` quantity counts as actual fulfillment,
- Sales Order becomes `FULFILLED` only after requested quantity is actually delivered.

### Billing & Collection

```text
Invoice: ISSUED → PARTIALLY_PAID → PAID
Payment: one or more cash receipts against Invoice
```

- invoice subtotal cannot exceed remaining uninvoiced Sales Order value,
- invoice is a billing snapshot,
- payment cannot exceed invoice outstanding balance,
- invoice with a payment cannot be voided,
- multiple payments support DP, installment, and settlement.

## 4. Core Source of Truth

- production cost → `Expense`
- biological harvest → `Harvest`
- sellable inventory → `HarvestLot`
- qualified demand → `SalesOpportunity`
- committed demand → `SalesOrderItem`
- physical source reservation → `FulfillmentAllocation`
- physical hand-over → `Delivery` + `DeliveryItem`
- billing → `Invoice`
- cash collection → `Payment`

CRM data never changes biological KPI formulas.

## 5. Sales Workspace — V0.11

Visible navigation is intentionally compact:

```text
Overview | Leads | Customers | Pipeline | Orders | Fulfillment | Finance
```

The domain model is **not** collapsed. Only the UI workspaces are consolidated:

```text
Fulfillment workspace
├── Allocation
└── Delivery

Finance workspace
├── Aging Piutang
├── Invoice
└── Payment
```

Canonical routes:

- `/sales`
- `/sales/leads`
- `/sales/customers`
- `/sales/pipeline`
- `/sales/orders`
- `/sales/fulfillment`
- `/sales/finance`

Backward-compatible routes redirect to the canonical workspaces:

- `/sales/deliveries` → `/sales/fulfillment#delivery`
- `/sales/invoices` → `/sales/finance#invoice`
- `/sales/payments` → `/sales/finance#payment`

This keeps the application at two visible navigation layers while preserving separate Delivery, Invoice, and Payment records in PostgreSQL.

## 6. Customer Account History

`/sales/customers?customerId=...` now exposes account-level commercial history:

- total orders,
- ordered kg,
- order value,
- average selling price per kg,
- delivered kg,
- invoiced amount,
- collected amount,
- outstanding receivable,
- last order date,
- purchase history by Sales Order,
- current OPEN Opportunity count.

The history is calculated from Sales Order, Delivery, Invoice, and Payment records rather than a duplicate customer ledger.

## 7. Receivable Aging

`/sales/finance` groups active invoice balances by due date:

```text
Belum jatuh tempo
1–30 hari
31–60 hari
>60 hari
```

Aging uses the Jakarta calendar date. An invoice due today remains current until the next calendar day.

Outstanding is always derived from:

```text
Invoice.totalAmount - SUM(Payment.amount)
```

for active unpaid invoices.

## 8. Export & Documents

Commercial exports introduced in V0.11:

- Sales Orders CSV,
- Payments CSV,
- Invoice PDF per invoice.

Invoice PDF includes:

- customer/account reference,
- Sales Order item reference,
- invoice subtotal/adjustment/total,
- paid amount,
- outstanding balance,
- payment history.

Because the current Invoice model stores a billing snapshot rather than invoice line items, Sales Order items shown on the PDF are explicitly labeled as **Sales Order references**. Partial invoice subtotal remains authoritative for the invoice amount.

## 9. Dashboard KPIs

- open leads,
- OPEN opportunity pipeline value,
- active order kg/value,
- allocated kg,
- available harvested kg,
- outstanding receivables,
- cash collected this month.

## 10. Application Services

Commercial write/read logic remains in the application layer:

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
- `get-customer-profile.ts`

Cross-row balances remain server-validated because they depend on current transactional state.

## 11. Runtime Validation Gate

V0.11 must pass locally before being called runtime-stable:

```text
Lead / Customer
→ Opportunity
→ Sales Order
→ Harvest / HarvestLot
→ Allocation
→ Delivery PLANNED
→ DISPATCHED
→ DELIVERED
→ Invoice
→ partial Payment
→ final Payment
→ Finance aging / Dashboard reconciliation
→ Invoice PDF
→ CSV exports
```

Validation commands:

```powershell
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

No database reset is required for V0.11 because this phase does not change the Prisma schema.

## 12. Future Extensions

- customer interaction timeline write flow,
- follow-up reminders,
- multi-item Sales Order UI,
- quotation workflow / quotation PDF,
- order cancellation workflow,
- delivery proof/photo,
- returns / claims,
- customer margin contribution,
- repeat-order metrics,
- WhatsApp interaction integration,
- demand vs projected harvest capacity.
