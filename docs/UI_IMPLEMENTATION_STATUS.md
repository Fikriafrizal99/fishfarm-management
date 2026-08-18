# FishFarm Management — UI & Navigation Implementation Status

Status: V0.8 operational UI completion pass

## Active top-level navigation

All visible sidebar destinations are now real routes:

- `/` — Dashboard Farm
- `/budidaya` — Budidaya workspace
- `/sales` — Sales CRM workspace
- `/alerts` — Decision Engine alert center
- `/more` — module directory / Lainnya

The top-bar bell links to `/alerts`.

## Active Budidaya routes

- `/budidaya` — ponds and active cycles overview
- `/input` — daily feed, mortality, and optional additional cost input
- `/sampling` — sampling / ABW / observed population input
- `/harvest` — partial/final harvest and HarvestLot creation
- `/expenses` — dedicated operational expense input
- `/ponds/[pondCode]` — pond/cycle detail

All of the routes above use the operational design language and shared app chrome.

## Active Sales CRM routes

- `/sales` — CRM dashboard
- `/sales/leads` — lead entry and list
- `/sales/customers` — customer entry and list
- `/sales/orders` — sales-order entry and list
- `/sales/fulfillment` — SalesOrderItem ↔ HarvestLot allocation

Sales routes use the shared app shell and operational design language.

## Commercial modules modeled but not yet writable from UI

These entities exist in the database/domain but their complete write workflows are intentionally not exposed as active navigation yet:

- Delivery
- Invoice
- Payment
- full Opportunity/Pipeline management
- Customer Interaction timeline

On the Sales dashboard these are shown as unavailable/pending labels rather than clickable menu items. This avoids presenting incomplete features as working navigation.

## Production ↔ Sales boundary

Production and CRM remain loosely coupled:

`ProductionCycle → Harvest → HarvestLot ← FulfillmentAllocation → SalesOrderItem ← SalesOrder`

The Harvest screen is operational. Legacy `sellingPricePerKg` and `buyerName` fields remain during V0.8 transition because the current Harvest schema still requires commercial realization values. New sales/order allocation should use Sales CRM and Fulfillment rather than binding an order directly to a pond.

## Design consistency rule

Dashboard, Budidaya, Alert, Lainnya, operational forms, pond detail, Sales dashboard, and Sales child workspaces must share:

- Inter typography
- neutral application canvas
- 6–11px radius hierarchy
- border-first surfaces
- compact information density
- shared topbar/sidebar navigation
- teal only as an accent/primary action

Do not reintroduce the previous large gradient hero / rounded SaaS-card visual language.
