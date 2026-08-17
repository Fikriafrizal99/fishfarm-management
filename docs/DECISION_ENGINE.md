# Decision Engine — FishFarm Management

Version: 0.1

## 1. Purpose

The Decision Engine turns raw farm records and calculated KPIs into **explainable operational alerts**.

V1 is deliberately **rules-based**, not AI-first.

Why:
- rules are testable
- every alert can show its reason
- thresholds can be tuned per species/system
- the farm does not yet have enough historical data to justify a predictive model
- incorrect AI advice in biological operations can be costly

AI may later summarize or rank alerts, but it should not replace deterministic KPI logic without validated evidence.

## 2. Engine Contract

Input:
- production cycle configuration
- targets
- latest KPI state
- recent raw events
- data-quality/confidence flags

Output:

```text
Alert {
  rule_code
  severity
  title
  metric_name
  metric_value
  threshold_value
  reason
  recommended_action
  triggered_at
  rule_version
}
```

Severity:
- `INFO`
- `WARNING`
- `ACTION_REQUIRED`

## 3. Evaluation Flow

```text
Operational event saved
        |
        v
Recalculate affected KPIs
        |
        v
Check data quality
        |
        v
Evaluate active rules
        |
        +-- no issue -> NORMAL
        |
        +-- threshold crossed
                |
                v
             Alert
                |
                +-- Dashboard
                +-- Pond Detail
                +-- Future Notification Adapter
```

## 4. Rule Design Principles

### Explainable
Every rule must answer:
- what happened?
- what value caused it?
- what was the expected threshold/target?
- what should the user check next?

### Configurable
Avoid treating one biological threshold as universal for all species, ages, stocking densities, or farming systems.

Default thresholds are only starting values and should eventually support species/system profiles.

### Data-Aware
A rule must not trigger a confident biological conclusion when its required input is missing or stale.

### Non-Diagnostic
V1 alerts should recommend checks, not claim disease diagnosis.

Example:

Bad:
> Fish have bacterial infection.

Good:
> Mortality increased above the configured threshold. Check water quality, feeding response, fish behavior, and signs of disease.

## 5. Rule Groups

## A. Data Quality Rules

### `DQ_SAMPLING_STALE`

Purpose: ensure biological estimates are not based on old sampling data.

Example logic:

```text
if days_since_latest_sampling > configured_sampling_interval:
    WARNING
```

Output example:
> Sampling terakhir 9 hari lalu. Biomassa dan FCR saat ini memakai data bobot yang sudah lama. Lakukan sampling ulang.

### `DQ_INITIAL_BIOMASS_MISSING`

```text
if initial_avg_weight is missing and FCR requested:
    INFO
```

The system should show FCR as `INSUFFICIENT_DATA`, not a fabricated value.

## B. Mortality Rules

### `MORTALITY_DAILY_HIGH`

Initial configurable example:

```text
warning when daily_mortality_pct >= warning_threshold
ACTION_REQUIRED when daily_mortality_pct >= critical_threshold
```

Thresholds must live in configuration, not hard-coded UI code.

Recommended action:
- inspect fish behavior
- check water quality if measurements are available
- inspect feeding response
- inspect visible disease/injury signs
- verify counting/input accuracy

### `MORTALITY_TREND_UP`

Detect repeated increase rather than one isolated event.

Simple V1 logic:

```text
if mortality in recent 3-day window is materially higher than previous 3-day window:
    WARNING
```

Only enable after enough data exists.

## C. Survival Rules

### `SR_BELOW_TARGET`

```text
if estimated_sr < target_sr - tolerance:
    WARNING or ACTION_REQUIRED
```

Message must identify that SR is **estimated** when partial harvest count or mortality recording is incomplete.

## D. FCR Rules

### `FCR_ABOVE_TARGET`

Example relative logic:

```text
ratio = current_fcr / target_fcr

if ratio >= 1.10:
    WARNING
if ratio >= 1.20:
    ACTION_REQUIRED
```

Only evaluate when FCR calculation status is valid.

Recommended checks:
- recent feed quantity
- sampling freshness
- feed wastage
- fish appetite/behavior
- water quality context
- unusual mortality

Do not state that excessive feeding is definitely the cause.

## E. Growth Rules

### `GROWTH_BELOW_TARGET`

Only active when a target growth curve or stage target exists.

```text
deviation_pct = (actual_abw - target_abw) / target_abw × 100

if deviation_pct <= -10%:
    WARNING
if deviation_pct <= -20%:
    ACTION_REQUIRED
```

Thresholds are configurable examples, not universal biological standards.

### `ADG_SLOWDOWN`

Compare recent ADG with previous interval when sample spacing is reasonable.

Use only after at least 3 valid sampling points exist.

## F. Cost Rules

### `HPP_ABOVE_TARGET`

```text
if projected_hpp > target_hpp:
    WARNING
if projected_hpp > target_hpp × critical_multiplier:
    ACTION_REQUIRED
```

The alert should show cost drivers if available, e.g. feed share of total cost.

### `FEED_COST_SHARE_HIGH`

This should be benchmarking-oriented and configurable. Do not hard-code one global percentage as biologically or financially correct.

## G. Margin Rules

### `PROJECTED_MARGIN_LOW`

Example configurable business logic:

```text
if projected_margin < warning_margin:
    WARNING
if projected_margin < 0:
    ACTION_REQUIRED
```

Message example:
> Proyeksi margin turun ke 8,4%. HPP meningkat sementara harga jual target belum berubah. Periksa biaya pakan dan proyeksi berat panen.

## H. Harvest Readiness Rules

### `HARVEST_DATE_NEAR`

```text
if target_harvest_date within N days:
    INFO
```

If latest sampling is stale, pair with data-quality alert rather than declaring harvest readiness.

### `TARGET_DATE_NEAR_WEIGHT_BELOW_TARGET`

Only valid if target ABW/harvest requirement exists.

```text
if harvest_date_near and actual_abw materially below target:
    WARNING
```

## 6. Alert Lifecycle

States:
- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

Rules should avoid creating a new duplicate alert every recalculation.

Recommended behavior:
- same `cycle_id + rule_code` updates existing OPEN alert
- resolve automatically when metric returns within safe range for required confirmation period
- store trigger and resolution timestamps

## 7. Hysteresis / Alert Noise Control

To avoid red/green oscillation around one threshold:

Example:
- trigger FCR warning at `> target × 1.10`
- resolve only after `< target × 1.05`

Exact buffers are configurable per rule.

Later add:
- minimum duration
- confirmation count
- cooldown period

## 8. Rule Configuration Model

Suggested structure:

```text
RuleConfig {
  rule_code
  enabled
  species_id nullable
  pond_type nullable
  warning_threshold
  critical_threshold
  resolution_threshold
  minimum_data_points
  parameters_json
  version
}
```

Resolution priority:
1. cycle-specific override
2. species + farm-system profile
3. farm default
4. application default

## 9. Decision Status for UI

Each active cycle can have one summarized status:

### `ON_TARGET`
No open WARNING/ACTION_REQUIRED and critical KPIs are within targets.

### `MONITOR`
At least one WARNING exists or key data is stale.

### `NEEDS_ATTENTION`
At least one ACTION_REQUIRED alert exists.

### `INSUFFICIENT_DATA`
Not enough reliable biological data to evaluate important metrics.

The summary status must link to the underlying alerts.

## 10. Example Evaluation

Cycle:
- `KLM-002 — Nila`
- target FCR: `1.20`
- current FCR: `1.42`

```text
ratio = 1.42 / 1.20 = 1.1833
```

With warning multiplier 1.10 and critical multiplier 1.20:

Result:
- `FCR_ABOVE_TARGET`
- severity: `WARNING`

Example explanation:

> FCR saat ini 1,42, sekitar 18,3% di atas target 1,20. Periksa jumlah pakan terbaru, umur data sampling, kemungkinan pakan tidak termakan, respons makan ikan, dan kondisi kualitas air.

This is preferable to an opaque score because the farmer can see exactly why the status changed.

## 11. Testing Requirements

Every rule must have unit tests for:
- below threshold
- exactly threshold
- above warning
- above critical
- missing input
- stale input
- resolution condition
- duplicate-alert prevention

KPI tests and Decision Engine tests are considered core business tests, not optional UI tests.

## 12. AI Roadmap

AI is a later layer, potentially for:
- daily natural-language farm summary
- explaining multiple alerts together
- comparing completed cycles
- finding repeated cost/performance patterns
- suggesting which records to inspect

A future AI module must receive structured KPI/alert data and cannot silently redefine formulas.

Predictive models such as harvest-date or feed optimization should only be attempted after enough clean historical cycle data has been collected and validated.
