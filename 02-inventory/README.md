# 02 – Inventory

Complete documentation of the **Inventory** menu option of TrackSmart (sidebar item #2, route `/inventory`): the carrier's register of company property — fuel cards, transponders, ELDs, keys, PPE, devices — and who holds it, in four tabs **List · Drivers · Assets · Vendors**, plus the item, holder and vendor pages, the Add / Edit item and Manage inventory wizards, and the driver's collect-and-sign flow.

Written so a developer or an AI agent can rebuild the section from this folder alone. Test accounts and fictional demo data only; nothing in the screenshots or video is masked. Same structure as [01 – Account](../01-account/README.md).

| | |
|---|---|
| App | TrackSmart (fleet compliance platform, prototype) |
| Section | Menu option #2 – Inventory |
| Version | 1.0 · documented 2026-10-23 |
| Hosting | Not hosted — by decision (Step 11 skipped, 2026-10-23). Read the folder directly or open the PDF. |

## Index

**[CHECKLIST.md](CHECKLIST.md)** — the Step 12 final check: what was verified, and the open decisions (TO CONFIRM) that need an answer.

### docs/
| File | What it is | Status |
|---|---|---|
| [docs/page-overview.md](docs/page-overview.md) | Every tab, page, field, button, toggle, dialog, state and role difference, as a tree + tables; 27 open questions (Step 1) | ✅ done |
| [docs/design.md](docs/design.md) | Layout, typography, components, icons, interactions, accessibility, linked to screenshots (Step 5) | ✅ done |
| [docs/agent.md](docs/agent.md) | Build / maintain instructions for an AI coding agent: stack, structure, behaviour to preserve, API, validation and security, acceptance checklist (Step 6) | ✅ done |

### data/
| File | What it is | Status |
|---|---|---|
| [data/schema.md](data/schema.md) | MongoDB data model: 6 collections, every field with type / required / default, relationships to Account, indexes (Step 7) | ✅ done |
| [data/collections/](data/collections/) | One JSON Schema (draft-07) per collection, generated from the same definition as schema.md (Step 7) | ✅ done |
| [data/sample-data/](data/sample-data/) | 3–5 fictional documents per collection (25 in all), validated against the schemas (Step 7) | ✅ done |

### design/
| File | What it is | Status |
|---|---|---|
| [design/color-palette.json](design/color-palette.json) | 31 colour tokens with HEX/RGB, usage, light + proposed dark values, 24 WCAG contrast pairs, the 77 raw Tailwind colours in use (Step 8) | ✅ done |
| [design/color-palette.md](design/color-palette.md) | The same palette, readable, with swatches and fixes for the 5 failing pairs (Step 8) | ✅ done |
| [design/figma-link.md](design/figma-link.md) | Figma build guide: what to import, page / frame / component structure. **The Figma file itself is TO CONFIRM** — no Figma access in the documenting session (Step 9) | ⚠️ link pending |
| [design/figma/](design/figma/) | `tokens.json` (DTCG variables, Light + Dark, 15 text styles) and `components.html` (15 component sets, importable with html.to.design) (Step 9) | ✅ done |
| [design/exports/](design/exports/) | Component sheet + 15 component PNGs, vector `color-tokens.svg`, 18 labelled desktop + mobile key frames (Step 9) | ✅ done |

### screenshots/
| Folder | Contents | Status |
|---|---|---|
| [screenshots/index.md](screenshots/index.md) | One line per image with a caption, plus the states that cannot be captured (Step 3) | ✅ done |
| screenshots/hosted-docs.png | Screenshot of a hosted docs site (Step 11) | ➖ not needed — the folder is not hosted |
| screenshots/desktop/list/ · drivers/ · assets/ · vendors/ | 119 captures at 1440 px, `[tab]-[state]-desktop.png` (Step 3) | ✅ done |
| screenshots/mobile/list/ · drivers/ · assets/ · vendors/ | 119 captures at 390 px, `[tab]-[state]-mobile.png` (Step 3) | ✅ done |

### video/
| File | What it is | Status |
|---|---|---|
| [video/inventory-walkthrough.mp4](video/inventory-walkthrough.mp4) | 1080p H.264 walkthrough (3 min 21 s) of every tab and the main actions, office and driver side, captions burned in, nothing masked (Step 4) | ✅ done |
| [video/script.md](video/script.md) | The caption / voice-over script with timestamps (Step 4) | ✅ done |

### pdf/
| File | What it is | Status |
|---|---|---|
| [pdf/inventory-section.pdf](pdf/inventory-section.pdf) | Everything above in one A4 document: cover, contents, overview, all 238 screenshots with captions, design spec, colour palette, data model, agent summary, links (Step 10) | ✅ done |

## Folder tree

```
02-inventory/
├── README.md
├── CHECKLIST.md
├── docs/
│   ├── page-overview.md
│   ├── design.md
│   └── agent.md
├── data/
│   ├── schema.md
│   ├── collections/
│   └── sample-data/
├── design/
│   ├── color-palette.json
│   ├── color-palette.md
│   ├── figma-link.md
│   ├── figma/              tokens.json · components.html
│   └── exports/            components-sheet.png · components/ · color-tokens.svg · frames/
├── screenshots/
│   ├── index.md
│   ├── desktop/  list/ · drivers/ · assets/ · vendors/
│   └── mobile/   list/ · drivers/ · assets/ · vendors/
├── video/
│   ├── inventory-walkthrough.mp4
│   └── script.md
└── pdf/
    └── inventory-section.pdf
```

## Conventions

- Screenshot names: `[tab]-[state]-[device].png`. Pages reached from a tab are filed under that tab (the item page under `list/`, holder pages and the sign-form under `drivers/` / `assets/`, the vendor profile under `vendors/`).
- **ASSUMPTION:** = inferred from code, not seen on screen. **TO CONFIRM:** = needs a product decision or a check that could not be made; all of them are numbered in [page-overview.md §12](docs/page-overview.md#12-to-confirm-open-questions).
- Nothing is masked in screenshots or video: every name, address, email and phone number is fictional demo data from the prototype's test accounts.
