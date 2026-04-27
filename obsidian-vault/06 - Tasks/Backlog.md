---
name: Backlog
description: Deferred / future work items
type: tasks
tags: [tasks, backlog]
---

# Backlog

## UX / Architecture

- [ ] Migrate navigation from `useState` path to `react-router-dom` (already installed) — see [[Architecture]]
- [ ] Decide whether `/fuel` and `/settings/fuel` should be one page or two — see [[Fuel]]

## Documentation

- [ ] Inventory every UI primitive in [[UI Components]]
- [ ] Lift `Safety_Analysis_Calculation_Documentation_2026-03-09.pdf` rules into [[Safety Analysis Spec]]
- [ ] Document `AppDataContext` slices — see [[AppDataContext]]

## Cleanup

- [ ] Many root-level `cvor_*.py`, `fix_*.py`, `transform*.py` scripts — decide which to archive vs delete
- [ ] `compile_errors.txt`, `ts_errors.txt`, `vite_error.log`, `output.txt`, `report_matches.txt`, `replacement.txt` — likely stale, review
