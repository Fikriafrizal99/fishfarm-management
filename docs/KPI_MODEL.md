# KPI & Calculation Model — FishFarm Management

Version: 0.1

## 1. Principle

The application must distinguish between:

- **Observed** values: directly recorded or measured.
- **Estimated** values: derived using assumptions, especially live population and standing biomass.
- **Actual final** values: calculated from completed harvest/cost data.
- **Projected** values: forward-looking estimates and must never be displayed as actual results.

Every derived KPI should expose its calculation status where ambiguity matters.

## 2. Base Variables

For one production cycle:

- `S0` = initial stocked fish count
- `M` = cumulative recorded mortality count
- `Hc` = cumulative harvested fish count, if known
- `W0` = initial average weight in kg/fish
- `B0` = initial biomass in kg
- `Wt` = latest average body weight in kg/fish
- `Nt` = estimated current live population
- `Bt` = estimated current standing biomass in kg
- `F` = cumulative feed delivered in kg
- `Hw` = cumulative harvested biomass in kg
- `C` = cumulative attributable production cost
- `R` = cumulative harvest revenue

## 3. Initial Biomass

When initial average weight is known:

```text
B0 = S0 × W0
```

Example:
- 3,000 fish
- 10 g/fish = 0.010 kg/fish

```text
B0 = 3,000 × 0.010 = 30 kg
```

If initial average weight is unknown, biomass-gain-dependent KPIs must be marked lower-confidence or unavailable until a valid baseline exists.

## 4. Estimated Live Population

Before any harvest:

```text
Nt = S0 - M
```

If harvested fish count is known:

```text
Nt = S0 - M - Hc
```

If harvest occurred but fish count was not recorded, current population cannot be considered exact. The UI should label it **Estimated Population** and expose the limitation.

## 5. Mortality Rate

Cumulative mortality rate:

```text
Mortality Rate (%) = M / S0 × 100
```

Daily mortality rate can use initial stock as a stable denominator for simple V1 alerting:

```text
Daily Mortality (%) = mortality_today / S0 × 100
```

Later versions may support stage-adjusted denominators.

## 6. Survival Rate (SR)

### Active Cycle — No Harvest Yet

```text
Estimated SR (%) = (S0 - M) / S0 × 100
```

### Active Cycle — Partial Harvest

If harvested fish count is known:

```text
Accounted Fish = current_live_fish + cumulative_harvested_fish
SR (%) = Accounted Fish / S0 × 100
```

This prevents partial harvesting from being incorrectly treated as mortality.

### Final Cycle

If total harvested fish count is known:

```text
Final SR (%) = total harvested fish count / S0 × 100
```

If harvested fish count is not known, **Final SR must not be fabricated from weight alone**. It should be shown as unavailable or estimated only if a documented estimation method is used.

## 7. Average Body Weight (ABW)

If total sample weight is recorded:

```text
ABW (kg/fish) = total sample weight kg / sample count
ABW (g/fish) = ABW kg × 1,000
```

Example:

```text
8.1 kg / 30 fish = 0.27 kg = 270 g/fish
```

If user directly enters ABW, that observed value is stored while consistency checks can be performed if sample total weight is also supplied.

## 8. Estimated Standing Biomass

```text
Bt = Nt × Wt
```

Example:
- estimated live population = 2,826
- ABW = 270 g = 0.270 kg

```text
Bt = 2,826 × 0.270 = 763.02 kg
```

The UI should show **Estimated Biomass**, not simply Biomass, unless based on a direct full-count/full-weigh event.

## 9. Biomass Gain

Before harvest:

```text
Biomass Gain = Bt - B0
```

With partial harvests:

```text
Adjusted Biomass Gain = Bt + Hw - B0
```

At final harvest where standing biomass is effectively zero:

```text
Final Biomass Gain = Hw - B0
```

## 10. Feed Conversion Ratio (FCR)

FCR is calculated against biomass gain, not simply final biomass.

### Active Cycle, No Harvest

```text
FCR = F / (Bt - B0)
```

### Active Cycle With Partial Harvest

```text
FCR = F / (Bt + Hw - B0)
```

### Completed Cycle

```text
Final FCR = F / (Hw - B0)
```

FCR is unavailable when biomass gain is zero/negative or baseline biomass is insufficient.

## 11. Growth

### Absolute Weight Gain

```text
Weight Gain = latest ABW - previous ABW
```

### Average Daily Gain (ADG)

```text
ADG (g/day) = (latest ABW g - previous ABW g) / days between samples
```

### Specific Growth Rate (optional later)

```text
SGR (%/day) = [ln(W2) - ln(W1)] / days × 100
```

SGR can be added after the MVP if it provides actionable value for the chosen species/system.

## 12. Cumulative Feed

```text
Cumulative Feed = sum(feeding_log.quantity_kg)
```

Feed cost should come from linked financial transactions or from quantity × unit cost using one canonical costing flow.

## 13. Total Production Cost

```text
C = sum(all cycle-attributable production expenses)
```

Typical categories:
- seed
- feed
- medicine/probiotic
- electricity
- water
- labor
- maintenance
- transport
- other direct costs

Shared farm overhead requires an allocation method and should not silently enter cycle cost without a documented rule.

## 14. Current Cost per Standing Biomass

Useful operational indicator, but this is **not final HPP**:

```text
Current Cost per Estimated Standing kg = C / Bt
```

Label clearly because the cycle is unfinished.

## 15. Projected HPP

If a credible projected final harvest weight `Hp` exists:

```text
Projected HPP = Projected Total Cost / Hp
```

Projected total cost may initially equal current cost plus planned/forecast remaining cost.

If remaining cost is not forecasted, the app should label the metric as a simplified projection.

## 16. Actual HPP

For a completed cycle:

```text
Actual HPP = Final Production Cost / Total Harvested Weight
```

Example:

```text
Rp13,550,000 / 810 kg = Rp16,728.40/kg
```

## 17. Break-Even Selling Price

Simplest cycle-level break-even price:

```text
BEP Price per kg = Final/Projected Total Cost / Sellable Harvest Weight
```

For planning, use projected sellable harvest weight and clearly label it projected.

## 18. Revenue

For each harvest event:

```text
Harvest Revenue = harvest weight × selling price/kg
```

Cycle revenue:

```text
R = sum(all harvest revenue)
```

## 19. Net Profit

```text
Net Profit = R - C
```

If taxes, financing cost, owner salary, or overhead allocations are not included, UI/reporting must not imply accounting net income. Prefer the label **Cycle Profit** or **Production Profit** until accounting scope is expanded.

## 20. Profit Margin

```text
Margin (%) = (R - C) / R × 100
```

Only valid when revenue > 0.

## 21. ROI — Optional

If used:

```text
Cycle ROI (%) = Cycle Profit / C × 100
```

Keep ROI separate from profit margin because their denominators differ.

## 22. Cycle Duration

```text
Cycle Duration = final harvest date - stocking date
```

For active cycles:

```text
Day of Culture (DOC) = current farm date - stocking date
```

## 23. Target vs Actual

Each key KPI can expose:

```text
Variance = Actual - Target
Variance % = (Actual - Target) / Target × 100
```

Directionality matters:
- higher SR is usually favorable
- lower FCR is usually favorable
- lower HPP is usually favorable
- higher margin is usually favorable

The UI must not apply one universal green/red direction to all metrics.

## 24. Data Quality / Confidence Flags

Recommended calculation status:

- `EXACT` — based on complete/direct records
- `ESTIMATED` — population/biomass contains estimation
- `PROJECTED` — forward-looking forecast
- `INSUFFICIENT_DATA` — calculation should not be shown as a number

Examples:
- FCR without initial biomass: `INSUFFICIENT_DATA`
- active standing biomass from latest sample: `ESTIMATED`
- HPP before final harvest: `PROJECTED`
- final revenue from completed harvest records: `EXACT`

## 25. Formula Versioning

Every persisted KPI snapshot should record a `calculation_version`, e.g. `kpi-v1`.

This allows formulas to improve later without losing the meaning of historical snapshots.
