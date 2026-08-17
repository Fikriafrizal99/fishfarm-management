# UI Reference — FishFarm Management

This document is the visual reference for the first implementation of FishFarm Management.

![FishFarm Management UI concept](assets/fishfarm-ui-concept.svg)

## Purpose

The mockup is a **product direction**, not a pixel-perfect final specification. The implementation should preserve the information hierarchy, field usability, KPI semantics, and mobile-first experience while allowing the design system to evolve.

## Primary Screens

### 1. Dashboard

The dashboard answers one question first: **how is the farm performing right now?**

Primary content:

- Active ponds
- Active fish population
- Estimated biomass
- Running production cost
- Survival Rate (SR)
- Mortality rate
- FCR
- Estimated HPP/kg
- Estimated margin
- Pond health/status cards

Status colors must always be accompanied by text labels such as `ON TARGET`, `MONITOR`, or `NEEDS ATTENTION`; color alone must not carry meaning.

### 2. Pond / Production Cycle Detail

Shows the current biological and operational state of one pond-cycle pair.

Primary content:

- Species
- Pond dimensions / volume
- Initial stocking quantity
- Stocking date / culture day
- Target harvest
- Average Body Weight trend
- Survival Rate trend
- FCR trend
- Current decision-engine status

### 3. Daily Input

Daily data entry must be optimized for field use and require as few taps as practical.

Initial fields:

- Date
- Pond / active production cycle
- Feed quantity
- Mortality count
- Medicine / probiotic usage or expense
- Notes

Later versions can split quick actions for feed, mortality, water quality, expense, and treatment records without making the main daily workflow heavy.

### 4. Finance & Harvest

Connect biological performance to business performance.

Primary content:

- Seed cost
- Feed cost
- Medicine / treatment cost
- Utilities
- Labor
- Other production costs
- Total production cost
- Harvest weight
- Selling price/kg
- Revenue
- Net profit
- Margin
- Actual FCR
- Actual SR
- Actual HPP/kg

## Navigation Direction

Initial bottom navigation:

1. Dashboard
2. Kolam
3. Input
4. Keuangan
5. Panen

Sampling remains a first-class domain feature but may live inside an active pond/cycle flow instead of occupying permanent bottom navigation.

## Design Principles

- Mobile-first and thumb-friendly.
- Important values must remain readable outdoors and on small screens.
- Data-entry forms should favor numeric keyboards and sensible defaults.
- Separate **actual**, **estimated**, and **projected** values visually and semantically.
- Never show an unexplained alert. Every warning should expose the metric and rule that triggered it.
- Avoid decorative complexity that slows down daily recording.
- Dashboard cards should prioritize decision usefulness over the number of metrics shown.

## Implementation Note

Frontend components should consume KPI values from the application/service layer. Formulas such as SR, FCR, HPP, margin, and harvest projection must not be independently reimplemented inside UI components.

This keeps the UI consistent with `KPI_MODEL.md`, `DOMAIN_MODEL.md`, and `DECISION_ENGINE.md`.