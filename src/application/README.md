# Application Layer

This layer coordinates use cases between persistence and domain logic.

Planned services:

```text
farm/
pond/
cycle/
operations/
biology/
finance/
harvest/
kpi/
decision-engine/
```

Examples:

- `createProductionCycle`
- `recordStocking`
- `recordFeeding`
- `recordMortality`
- `recordSampling`
- `recordTreatment`
- `recordExpense`
- `recordHarvest`
- `recalculateCycleMetrics`
- `evaluateCycleAlerts`

The application layer owns transaction boundaries. For example, `recordFeeding` may save a `FeedingLog` and its linked canonical `Expense` in one database transaction when feed cost is supplied.
