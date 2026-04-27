---
name: AppDataContext
description: Global React context providing app-wide mock state
type: data
tags: [data, state, context]
---

# AppDataContext

**File:** `src/context/AppDataContext.tsx`

## Purpose

Top-level React context that provides app-wide mock data (accounts, fleet, drivers, etc.) to nested pages without prop drilling.

## Pattern

Provider wraps `<App />` (typically in `main.tsx` or `App.tsx`); pages call a `useAppData()` hook to read/update.

## Open questions

- [ ] Document what slices live here vs. in per-page state.
- [ ] Decide whether to keep this or migrate to a dedicated state lib (Zustand, Redux Toolkit) once a backend is added.

## Related

- [[Architecture]]
- [[Data Index]]
