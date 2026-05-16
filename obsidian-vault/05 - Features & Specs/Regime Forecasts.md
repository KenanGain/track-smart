---
name: Regime Forecasts
description: Per-regulatory-regime safety forecasts (FMCSA / Ontario CVOR / NSC AB-BC-NS-PE) — data model, scoring, and UI
type: spec
tags: [feature, forecast, regulatory, fmcsa, cvor, nsc, safety]
---

# Regime Forecasts

Per-regulatory-regime 12-month forecast surfaced inside the Forecast tab of [[Beta Safety Analysis]]. Mirrors the structure of the carrier-wide risk-score forecast but scopes every monthly score to one regulator's jurisdiction.

## Why

A national carrier holding USDOT + CVOR + multi-province NSC numbers is judged by **six** different rating models. The aggregate Fleet Score smooths over the variance — this section preserves it. A degrading CVOR while FMCSA improves is the kind of split that a single composite can't show.

## Regime catalogue

| `RegimeKey` | Label | Jurisdiction filter | Applies when |
| --- | --- | --- | --- |
| `fmcsa`  | FMCSA SMS                     | US states (DC included), or `country ∈ {US, USA}`, never Canada | `accounts.dotNumber` set |
| `cvor`   | Ontario CVOR                  | `state === 'ON'`                                                | `accounts.cvorNumber` set |
| `nsc-ab` | NSC Alberta                   | `state === 'AB'`                                                | NSC abstract prefixed `AB-` |
| `nsc-bc` | NSC British Columbia          | `state === 'BC'`                                                | NSC abstract prefixed `BC-` |
| `nsc-ns` | NSC Nova Scotia               | `state === 'NS'`                                                | NSC abstract prefixed `NS-` |
| `nsc-pe` | NSC Prince Edward Island      | `state === 'PE'`                                                | NSC abstract prefixed `PE-` |

Source: `REGIME_META` + `REGIME_FILTERS` + `regimeApplies()` in `src/pages/safety-analysis/fleet-safety-score.data.ts`.

## Data flow

```
computeAllRegimeForecasts(accountId, horizonMonths, historyMonths)
  └─► For each RegimeKey:
        computeOneRegimeForecast(...)
          1. Resolve identity from ACCOUNTS_DB (DOT / CVOR / NSC numbers)
          2. Pull accidents · violations · inspections for the account
          3. Filter each event by REGIME_FILTERS[key].matchesJurisdiction
          4. Walk N historyMonths back-to-front, build a monthly safety score
              score = clamp(100 - 1.2·violations
                            - 5·violationOOS
                            - 6·accidents
                            - 3·inspectionOOS)
          5. linreg() on the series → slope, intercept, R², residuals
          6. Append horizon points = linear · (1 - dampW) + longRunMean · dampW
              with dampW = min(1, k / 36)
          7. 80% prediction interval per point: ±1.28σ · √(1 + k / n)
          8. Compute 12-month signal totals (events / oos / accidents / inspections / cleanRate)
          9. buildRegimeRecommendations(key, signals, trend) → 2-5 prescriptive actions
```

Helpers shared with the carrier-wide forecast: `linreg()`, `clamp()`, `ForecastPoint`. The same OLS-with-damping shape keeps both forecasts comparable.

## `RegimeForecast` shape

```ts
interface RegimeForecast {
  key: RegimeKey;
  label: string;         // "FMCSA SMS", "Ontario CVOR", …
  short: string;         // "FMCSA", "CVOR", "AB", "BC", "NS", "PE"
  regulator: string;     // "Federal Motor Carrier Safety Administration"
  description: string;   // One-line plain-language definition
  applies: boolean;      // Does the carrier hold the matching registration?
  currentScore: number;  // 0-100, higher = safer (last history point)
  horizonScore: number;
  horizonLower: number;
  horizonUpper: number;
  slope: number;         // pts / month (positive = improving)
  trend: 'Improving' | 'Stable' | 'Degrading';
  rSquared: number;
  confidence: 'Low' | 'Medium' | 'High';
  historyMonths: number;
  points: ForecastPoint[];  // history + forecast, same shape as CarrierForecast
  signals: { events; oos; accidents; inspections; cleanRate };
  recommendations: RegimeRecommendation[];
}
```

`ForecastPoint` carries `{ date, riskScore, isForecast, lower?, upper? }` — the chart shades `[lower, upper]` for forecast points.

## Trend & confidence thresholds

- `slope > +0.15 pts/mo` → **Improving**
- `slope < -0.15 pts/mo` → **Degrading**
- otherwise → **Stable**

- `n ≥ 18` AND `R² ≥ 0.55` → **High** confidence
- `n ≥ 9` AND `R² ≥ 0.30` → **Medium**
- otherwise → **Low**

## Recommendations engine — `buildRegimeRecommendations`

Recommendations are not hardcoded text — they're picked from the carrier's actual signal mix and the trend direction:

| Trigger | Priority | Title |
| --- | --- | --- |
| `trend === 'Degrading'` | High | Reverse the negative trend |
| `trend === 'Stable'` + events > 0 | Medium | Convert stable to improving |
| `signals.oos > 0` | High if ≥ 3 else Medium | Close N OOS findings |
| `signals.inspections > 0` AND `cleanRate < 70%` | Medium | Lift clean-inspection rate above 70% |
| `signals.accidents > 0` | High if ≥ 3 else Medium | Review N reportable collisions |
| Always (regime-specific) | Low | FMCSA · Watch the four heaviest BASICs |
| Always (regime-specific) | Low | CVOR · Balance the three CVOR buckets |
| Always (regime-specific) | Low | NSC AB · Hold the R-Factor below the Stage-2 line |
| Always (regime-specific) | Low | NSC BC · Keep the Carrier Profile in the satisfactory band |
| Always (regime-specific) | Low | NSC NS · Drive indexed demerit toward zero |
| Always (regime-specific) | Low | NSC PE · Trim Schedule 3 point accumulation |
| `events === 0 && inspections === 0` | Low (unshifted to top) | No events recorded — maintain programs |

Output is sorted High → Medium → Low and capped at 5 items.

## UI

`RegimeForecastsSection` ([file](../../src/pages/safety-analysis/BetaSafetyAnalysisPage.tsx)) inside the Forecast tab.

### Section header (collapsible)

- Title + tag-along chip count: `{N} active · {N} degrading · {N} OOS` — only renders chips that aren't zero.
- Chevron rotates 180° on expand.

### Aggregate KPI strip (renders when expanded)

Six tiles, each derived from the live regime forecasts:

| Tile | Source |
| --- | --- |
| Avg current        | mean(currentScore) across applicable regimes |
| Avg @ {horizon}mo  | mean(horizonScore) — with `+/−delta` chip |
| Degrading          | count of regimes with `trend === 'Degrading'` |
| High-risk          | count of regimes with `currentScore < 70` |
| OOS findings       | Σ signals.oos · subtitle Σ events / Σ inspections |
| High-priority actions | Σ recommendations with `priority === 'High'` · subtitle Σ accidents (12mo) |

Every tile has a hover tooltip that explains its source in plain language.

### Regime row (one per applicable regime, individually collapsible)

Header row uses a 4-column grid for vertical alignment across rows:

```
[ Identity ]                                [Trend]   [ score → score ±Δ ]   [▼]
```

- Identity = label + short-code chip + regulator subtitle.
- Trend = icon + word in tone colour (emerald / rose / slate) — no pill, native title carries slope and R².
- Score progression = current → horizon (both score-coloured) + tiny delta chip.
- Chevron rotates 180° on expand.

Expanded body:

1. **KPI grid (4 tiles)** — Events · OOS · Accidents · Clean % — each tile has a hover tooltip explaining the underlying count.
2. **Regime description band** — plain-language regulator summary + slope/R²/history-length.
3. **Sparkline chart** (`RegimeForecastSparkline`) — solid history + dashed forecast with shaded 80% confidence band. Hover snaps to the nearest month and shows `{YYYY-MM} · History|Forecast · score · 80% PI lower–upper`.
4. **Recommended actions list** — priority badges (High / Medium / Low) + title + detail.

## File map

| Layer | File |
| --- | --- |
| Data layer | `src/pages/safety-analysis/fleet-safety-score.data.ts` — `computeAllRegimeForecasts`, `computeOneRegimeForecast`, `buildRegimeRecommendations`, `REGIME_META`, `REGIME_FILTERS`, `regimeApplies` |
| UI shell | `src/pages/safety-analysis/BetaSafetyAnalysisPage.tsx` — `RegimeForecastsSection`, `RegimeForecastCard`, `RegimeAggKpi`, `RegimeKpi`, `RegimeForecastSparkline` |
| Chart helper | `useElementWidth` in the same file — drives a ResizeObserver so the sparkline viewBox tracks real pixel width (avoids `preserveAspectRatio="none"` stretching) |

## Related

- [[Beta Safety Analysis]] — the page that hosts this section
- [[Safety Analysis Spec]] — composite-score scoring model (predecessor)
- [[Carrier Profile Spec]] — DOT / CVOR / NSC numbers feed `regimeApplies`
