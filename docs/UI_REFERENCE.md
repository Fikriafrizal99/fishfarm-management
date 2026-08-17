# UI Reference — FishFarm Management

Version: 0.8

This document is the UI/information-hierarchy reference for FishFarm Management.

![FishFarm Management UI concept](assets/fishfarm-ui-concept.svg)

The original mockup visualizes the production area. V0.8 adds a separate Sales CRM area while preserving the same mobile-first design language.

## Purpose

The mockup is product direction, not a pixel-perfect final specification. Implementation should preserve:

- clear information hierarchy,
- fast field input,
- explicit KPI semantics,
- mobile usability,
- separation between production and commercial workflows.

## Top-Level Product Areas

```text
Dashboard / Budidaya
Sales CRM
Alerts / More later
```

Production and Sales must not be merged into one long dashboard.

## Production Screens

### Production Dashboard

Answers: **how is the farm performing right now?**

Primary content:
- active ponds
- estimated active fish
- estimated biomass
- running production cost
- SR
- mortality
- FCR
- pond/cycle health status

### Pond / Production Cycle Detail

Primary content:
- species
- pond context
- culture day
- stocking
- population
- ABW/growth
- biomass
- FCR
- cost breakdown
- target harvest
- alerts

Primary actions:
- Input Harian
- Sampling
- Harvest

### Daily Input

Optimized for field use.

Initial fields:
- date
- pond/cycle
- feed
- mortality
- additional expense
- notes

### Sampling

Fields:
- sample count
- total sample weight and/or ABW
- optional length
- optional observed population
- notes

### Harvest

Production screen, not CRM screen.

Fields:
- cycle
- harvest date
- partial/final
- count when known
- harvested kg
- harvest cost
- transitional legacy selling-price/buyer fields until migration is resolved

A successful Harvest produces a HarvestLot for Sales fulfillment.

## Sales CRM Screens

### Sales Dashboard — `/sales`

Answers: **what is happening commercially?**

Primary KPIs:
- open leads
- pipeline value
- confirmed order kg/value
- allocated kg
- available harvested kg
- outstanding receivables
- cash collected this month

Primary sections:
- lead follow-up list
- active order book
- HarvestLot inventory summary

### Leads — `/sales/leads`

Mobile form:
- title
- species/product interest
- source
- contact
- WhatsApp
- expected kg
- expected price/kg
- next follow-up
- notes

Lead listing should emphasize follow-up timing, not pond status.

### Customers — `/sales/customers`

Form:
- name
- customer type
- contact person
- WhatsApp/phone/email
- address
- notes

### Orders — `/sales/orders`

Basic V0.8 form:
- customer
- species
- quantity kg
- price/kg
- requested delivery date
- payment terms
- notes

Order must be allowed even when no HarvestLot exists.

### Fulfillment — `/sales/fulfillment`

This screen is the explicit integration boundary.

User selects:
- order item with remaining kg
- HarvestLot with available kg
- allocation kg

The UI must make this concept visible:

```text
Order demand ≠ harvested stock

They become connected only after Allocation.
```

### Future Commercial Screens

After validation:
- Opportunity pipeline
- CRM interaction timeline
- Delivery
- Invoice
- Payment
- customer transaction history

## Navigation Direction

V0.8 top-level direction:

```text
Dashboard | Budidaya | Sales | Alert | Lainnya
```

Current implementation exposes Sales as a clear link from the production dashboard while a permanent mobile bottom navigation can be finalized later.

Inside Sales:

```text
Sales Dashboard
Leads
Customers
Orders
Fulfillment
```

## Semantic Rules

### Production

Always distinguish:
- Observed
- Estimated
- Projected
- Actual Final

### Commercial

Always distinguish:
- pipeline / potential
- confirmed order
- allocated/committed inventory
- delivered quantity
- invoiced value
- paid value
- outstanding receivable

Do not label pipeline as revenue.
Do not label allocation as delivery.
Do not label invoice as payment.

## Design Principles

- mobile-first and thumb-friendly
- important values readable on small screens
- numeric keyboards/defaults for field forms
- status labels accompany colors
- no unexplained alerts
- avoid decorative complexity that slows entry
- production dashboard prioritizes biological/operational decisions
- Sales dashboard prioritizes follow-up, demand, fulfillment, and cash collection
- keep the two dashboard purposes visually distinct

## Implementation Note

Frontend components consume calculations/query results from application services.

Production formulas must not be reimplemented in UI components.
Commercial balance rules such as available HarvestLot quantity and outstanding receivables must also come from application/query services rather than independent client-side ledgers.

References:
- `KPI_MODEL.md`
- `DOMAIN_MODEL.md`
- `DECISION_ENGINE.md`
- `SALES_CRM.md`
