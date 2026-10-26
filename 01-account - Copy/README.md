# 01 – Account

Complete documentation of the **Account** menu option of TrackSmart (sidebar item #1, route `/account/profile`): the carrier's fleet profile with its four sections **Fleet Overview · Yard Terminals · Assets · Drivers**, every modal, wizard and detail page reachable from them.

Written so a developer or an AI agent can rebuild the section from this folder alone. Test accounts and fictional demo data only; nothing in the screenshots or video is masked.

| | |
|---|---|
| App | TrackSmart (fleet compliance platform, prototype) |
| Section | Menu option #1 – Account |
| Version | 1.0 · documented 2026-10-22 |
| Hosting | Not hosted — by decision (2026-10-23). Read the folder directly or open the PDF. |

## Index

### docs/
| File | What it is | Status |
|---|---|---|
| [docs/page-overview.md](docs/page-overview.md) | Every tab, sub-tab, field, button, toggle, modal, state and role difference, as a tree + tables (Step 1) | ✅ done |
| [docs/design.md](docs/design.md) | Layout, typography, components, icons, interactions, accessibility, linked to screenshots (Step 5) | ✅ done |
| [docs/agent.md](docs/agent.md) | Build / maintain instructions for an AI coding agent: stack, structure, API, validation, acceptance checklist (Step 6) | ✅ done |

### data/
| File | What it is | Status |
|---|---|---|
| [data/schema.md](data/schema.md) | MongoDB data model: 10 collections, every field with type / required / default, relationships, indexes (Step 7) | ✅ done |
| [data/collections/](data/collections/) | One JSON Schema (draft-07) per collection, generated from the same definition as schema.md (Step 7) | ✅ done |
| [data/sample-data/](data/sample-data/) | 2–5 fictional documents per collection, validated against the schemas (Step 7) | ✅ done |

### design/
| File | What it is | Status |
|---|---|---|
| [design/color-palette.json](design/color-palette.json) | 28 colour tokens with HEX/RGB, usage, light + proposed dark values, 22 WCAG contrast pairs, the 112 raw Tailwind colours in use (Step 8) | ✅ done |
| [design/color-palette.md](design/color-palette.md) | The same palette, readable, with swatches and fixes for the failing pairs (Step 8) | ✅ done |
| [design/figma-link.md](design/figma-link.md) | Figma build guide: what to import, page / frame / component structure. **The Figma file itself is TO CONFIRM** — no Figma access in the documenting session (Step 9) | ⚠️ link pending |
| [design/figma/](design/figma/) | `tokens.json` (DTCG variables, Light + Dark modes, 15 text styles) and `components.html` (13 component sets, importable with html.to.design) (Step 9) | ✅ done |
| [design/exports/](design/exports/) | Component sheet + 13 component PNGs, vector `color-tokens.svg`, 16 labelled desktop + mobile key frames (Step 9) | ✅ done |

### screenshots/
| Folder | Contents | Status |
|---|---|---|
| [screenshots/index.md](screenshots/index.md) | One line per image with a caption, plus the states that cannot be captured (Step 3) | ✅ done |
| screenshots/desktop/fleet-overview/ · yard-terminals/ · assets/ · drivers/ | 67 captures at 1440 px, `[tab]-[state]-desktop.png` (Step 3) | ✅ done |
| screenshots/mobile/fleet-overview/ · yard-terminals/ · assets/ · drivers/ | 65 captures at 390 px, `[tab]-[state]-mobile.png` (Step 3) | ✅ done |
| screenshots/hosted-docs.png | Screenshot of a hosted docs site (Step 11) | ➖ not needed — the folder is not hosted |

### video/
| File | What it is | Status |
|---|---|---|
| [video/account-walkthrough.mp4](video/account-walkthrough.mp4) | 1080p H.264 walkthrough (3 min 27 s) of every tab and main action, captions burned in, nothing masked (Step 4) | ✅ done |
| [video/script.md](video/script.md) | The caption / voice-over script with timestamps (Step 4) | ✅ done |

### pdf/
| File | What it is | Status |
|---|---|---|
| [pdf/account-section.pdf](pdf/account-section.pdf) | Everything above in one A4 document: cover, contents, overview, all 132 screenshots with captions, design spec, colour palette, data model, agent summary, links (Step 10) | ✅ done |

## Folder tree

```
01-account/
├── README.md
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
│   └── exports/
├── screenshots/
│   ├── index.md
│   ├── desktop/
│   │   ├── fleet-overview/
│   │   ├── yard-terminals/
│   │   ├── assets/
│   │   └── drivers/
│   └── mobile/
│       ├── fleet-overview/
│       ├── yard-terminals/
│       ├── assets/
│       └── drivers/
├── video/
│   ├── account-walkthrough.mp4
│   └── script.md
└── pdf/
    └── account-section.pdf
```

## Conventions (reused for every later menu option)

- Folder name: `NN-<menu-option>` (`02-messages`, `03-inventory`, …); the same file names inside.
- Screenshot name: `[tab]-[state]-[device].png`, tab and state in kebab-case, device `desktop` (1440) or `mobile` (390).
- Open questions are written as **TO CONFIRM:**; inferred behaviour as **ASSUMPTION:**.
- Nothing is masked in screenshots or video: every name, address, email, phone number and identifier in the app is fictional demo data and is shown exactly as the app shows it.
