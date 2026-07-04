---
name: Restaurant Health Engine
description: Architecture and scoring rules for the deterministic health scoring system
---

## Engine location
`artifacts/bardoctor/src/store/healthEngine.ts` — pure functions, no side-effects, no randomness.

## Category → data mapping

| Category    | Event categories            | Case types                  |
|-------------|-----------------------------|-----------------------------|
| equipment   | equipment                   | equipment                   |
| guests      | complaint                   | complaint                   |
| staff       | conflict                    | conflict + employees ratio  |
| operations  | operations, inventory, supplier | inspection, supplier, other |
| finance     | finance                     | finance                     |
| maintenance | maintenance                 | maintenance                 |
| tasks       | (none — uses ALL cases)     | all                         |

**Why supplier→operations:** No dedicated Suppliers category in the 7-category model; supplier events/cases still need to contribute to calibration.

**Why idea→excluded from totalRecords:** Idea events are positive suggestions, not operational problems; counting them inflates the calibration threshold without providing any score signal.

## Scoring algorithm

- Start at 100, subtract penalties for open issues
- critical: -30, high: -18, medium: -9, low: -4 (per open issue)
- Overdue issue: additional -12
- Issues >60 days old: 0.5× penalty factor
- Recently resolved (14 days): +5 each, capped at +25
- Staff special: dismissed/total ratio × 20 = additional penalty (0–20)
- Clamp to [0, 100], round to integer

## Calibration thresholds

- MIN_RECORDS_TOTAL = 3 (idea events excluded from this count)
- MIN_CATEGORIES_FOR_OVERALL = 2
- Returns `overall: null` when below threshold (NOT a null engine result — always returns HealthReport)

## Page structure

- Home.tsx: Compact dark card → tappable → navigates to /health. Shows 7 category dots when hasEnoughData. Uses HomeGauge (SVG, r=52, 144×144).
- Health.tsx: Full detail page. Large gauge (r=60, 160×160). 2-column grid of CategoryCard with mini gauge (r=28, 76×76). CalibrationState when hasEnoughData=false.

## ScoreVisual

scoreVisual(score) returns {color, label, bg, stroke}:
- 85–100: green (#16A34A/#22C55E)
- 70–84: light green
- 55–69: yellow (#D97706)
- 40–54: orange (#EA580C)
- 0–39: red (#DC2626)

Use `color` for text/chips, `stroke` for SVG arc fill.
