---
name: Data Index
description: Map of all data files (mock + types) in src/data and src/pages
type: index
tags: [data, index]
---

# Data Index

All mock data lives in `src/data/` (global) and inside per-feature folders under `src/pages/`. There is no backend yet — every list is a TS file.

## Global mock data — `src/data/`

| File | Purpose |
| --- | --- |
| `sidebar.data.ts` | [[Sidebar Data]] — sidebar nav structure |
| `mock-app-data.ts` | Composite app state seed |
| `key-numbers-mock-data.ts` | Sample carrier identifiers |
| `master-number-types.ts` | Identifier type taxonomy |
| `geo-data.ts` | States, provinces, country codes |
| `paystubs.data.ts` | Paystub mock records |
| `service-types.data.ts` | Service offering taxonomy |
| `training.data.ts` | Driver training records |
| `vendors.data.ts` | Vendor list |
| `violations.data.ts` | Violation taxonomy |
| `parsed-cvor.json` / `raw-cvor.txt` | Parsed CVOR sample data |
| `cleanup-cvor.cjs` / `merge-cvor.cjs` / `parse-cvor.cjs` | One-off scripts to massage CVOR data |

## Per-feature data — `src/pages/`

| File | Used by |
| --- | --- |
| `pages/accounts/accounts.data.ts` | [[Accounts List]], [[Add Account]] |
| `pages/accounts/carrier-assets.data.ts` | [[Inventory Assets]], [[Asset Directory]] |
| `pages/accounts/carrier-datasets.data.ts` | shared dataset registry |
| `pages/accounts/carrier-drivers.data.ts` | [[Inventory Drivers]] |
| `pages/accounts/carrier-fleet.data.ts` | [[Inventory Assets]] |
| `pages/accounts/carrier-fleet-shared.data.ts` | shared between fleet views |
| `pages/accounts/compliance.utils.ts` | compliance helpers (newly added — see `git status`) |
| `pages/profile/carrier-profile.data.ts` | [[Carrier Profile]] |
| `pages/settings/expenses.data.ts` | [[Settings — Expense Types]] |

## Global state

- [[AppDataContext]] — single React context that wires the mock data into the tree.

## See also

- [[Frontend Data Reference]] (lifted from `docs/Frontend_Data_Reference.md`)
