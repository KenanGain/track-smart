---
name: GVWR Classes
description: Vehicle classification by Gross Vehicle Weight Rating (FMCSA 8-class table)
type: spec
tags: [feature, assets, weight, gvwr]
---

# GVWR Classes

The 8-class FMCSA / DOT classification used to bucket vehicles by **Gross Vehicle Weight Rating**.

## The table

| Class | lb range            | kg range                | Category     |
| ----- | ------------------- | ----------------------- | ------------ |
| 1     | 0 – 6,000           | 0 – 2,722               | Light Duty   |
| 2     | 6,001 – 10,000      | 2,722 – 4,536           | Light Duty   |
| 3     | 10,001 – 14,000     | 4,536 – 6,350           | Medium Duty  |
| 4     | 14,001 – 16,000     | 6,351 – 7,257           | Medium Duty  |
| 5     | 16,001 – 19,500     | 7,258 – 8,845           | Medium Duty  |
| 6     | 19,501 – 26,000     | 8,846 – 11,793          | Medium Duty  |
| 7     | 26,001 – 33,000     | 11,794 – 14,969         | Heavy Duty   |
| 8     | 33,001 lb and above | 14,969 kg and above     | Heavy Duty   |

## In code

**File:** `src/pages/assets/gvwr.utils.ts`

Exports:

- `GVWR_CLASSES` — the canonical table (readonly array of 8 entries with `class`, `label`, `minLb/maxLb`, `minKg/maxKg`, `rangeLb`, `rangeKg`, `stringValue`).
- `getGVWRClass(weight, unit)` — returns the matching `GVWRClass` or `null`.
- `getGVWRClassLabel(weight, unit)` — short label or `'—'`.
- `getGVWRCategory(weight, unit)` — `'Light Duty' | 'Medium Duty' | 'Heavy Duty' | null`.

## Design notes

- **Class is derived, not stored.** The `Asset` type holds `grossWeight` + `grossWeightUnit` only; the class is computed on demand. Storing both would let them drift.
- Canonical ranges are defined in **lb**. `kg` input is converted via `1 kg = 2.20462 lb` before the lookup, so inputs in either unit classify consistently.
- `Class 8` upper bound is `Infinity`.
- `weight <= 0` or missing returns `null` (UI shows `—`).

## Where it's wired up

- [[Asset Directory]] / detail view (`src/pages/assets/AssetDetailView.tsx`) — shows a `GVWR Class` row next to `Gross Weight`.
- [[Inventory Assets]] add/edit modal (`src/pages/assets/AssetModal.tsx`) — shows a live `Class N` badge below the gross-weight input.

## Related

- [[Inventory Assets]]
- [[Asset Directory]]
- [[Data Index]]
