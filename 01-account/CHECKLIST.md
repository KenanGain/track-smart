# 01 – Account · Final check (Step 12)

Run on 2026-10-23 by a script over the whole folder (file presence, screenshot index ↔ files, every relative link and anchor in every `.md`, JSON validity, samples against schemas, video and PDF probes), plus the manual decisions below.

## Completion

| Check | Result |
|---|---|
| Every required file and folder exists | ✅ 17 / 17 — README, 3 docs, schema + 10 collection schemas + 10 sample files, palette (.json + .md), figma-link, exports, screenshots index + 132 PNGs, video + script, PDF |
| Every tab covered | ✅ 4 / 4 — Fleet Overview, Yard Terminals, Assets, Drivers each have a page-overview section, desktop and mobile screenshots, video captions and Figma key frames |
| Screenshots | ✅ 132 (67 desktop at 1440 px, 65 mobile at 390 px); all named `[tab]-[state]-[device].png`; index lists 132, disk holds 132, 0 missing either way |
| Links | ✅ 213 relative links (incl. `#anchors`) across all markdown files checked — 0 broken |
| Data | ✅ 24 JSON files parse; 40 sample documents validate against their collection schemas with 0 problems |
| Video | ✅ `video/account-walkthrough.mp4` — 3 min 27 s, 1920 × 1080, H.264; 46 timed captions in `video/script.md` |
| PDF | ✅ `pdf/account-section.pdf` — 96 A4 pages, 16.9 MB, all 9 required parts |
| Personal data masked | ⚠️ **Not masked — by owner decision (2026-10-23).** The brief asked for masking; the owner asked for nothing to be masked. Every name, address, email and phone number shown is fictional demo data from the prototype's test accounts. |
| Hosted | ➖ **Not hosted — by owner decision.** Step 11 skipped; no live URL, no `hosted-docs.png`. |
| Figma file | ⚠️ **Not created** — no Figma access in the documenting session. The import kit is complete (`design/figma/`, `design/exports/`, `design/figma-link.md`). |

States that exist but cannot be captured as images (native `confirm()` dialogs, opened native `<select>` lists, transient toasts) are listed with their exact text in `screenshots/index.md`.

## TO CONFIRM — decisions needed from you

### Product behaviour
1. **View-only roles** (Safety Manager, User) see the "View only" strip but every edit / add / delete control still works. Disable them in light mode? — page-overview §6
2. **Yard Terminals Security filter** offers score bands (High 90+ …) but the code filters by feature names, so the options do nothing. Which is intended? — page-overview §3
3. **Export** on Assets and Drivers does nothing. Should it download the visible rows as CSV? — page-overview §4.1, §5.1
4. **DOT Lookup and VIN Lookup** — real FMCSA SAFER / VIN decode, or keep as demo stubs? — page-overview §2.1, §4.2
5. **State of Inc. and address State** lists show 4–5 states. Use the full US + Canada lists? — page-overview §2.1, §2.3
6. **Fleet Overview edit modals** mark fields required but still save when they are empty. Enforce? — page-overview §2.1
7. **Add Driver** saves with every field empty. Which fields must block *Save Driver*? — page-overview §5.3, agent §6
8. **Removing a corporate office location** has no confirmation. Add one? — page-overview §2.7
9. **Directors** cannot be deleted. Intended? — page-overview §2.8
10. **Driver import** — offer a downloadable template file? — page-overview §5.2
11. **Dead code**: the unreachable Compliance / Documents tabs inside `CarrierProfilePage.tsx` — remove? — page-overview §8
12. **No-carrier state** could not be captured: add a demo login with no carrier assigned? — screenshots/index.md

### Data and API (rebuild)
13. **Target stack**: Node.js REST API + MongoDB, as assumed in agent.md §2.2?
14. **Yard security score**: 20 points per feature — the right weighting? — schema `yards.score`
15. **Drivers soft-deleted** (`deletedAt`) so compliance history survives? — schema, agent §5.4
16. **Refuse deleting** an asset or driver while it is on an open work order or hand-over? — schema relationships, agent §5.3
17. **Filed fleet counts** (`fleetCounts`) — keep editable once live counts from assets / drivers exist? — schema
18. **SSN / SIN encryption keys** — KMS or an application secret? — schema `drivers.ssnEncrypted`
19. **Re-authentication** for destructive writes (delete driver / asset / yard, Terminate) — adopt? — agent §6

### Design and accessibility
20. **Inter 700 is not loaded** but `font-bold` is used everywhere (bold is synthesised). Load 700 or map bold to 600? — design §2
21. **Hard-coded `#2563EB`** (old Tailwind v3 blue) on 8 elements — replace with `bg-blue-600` (`#155dfc`)? — color-palette notes
22. **Grey 10–11 px labels fail contrast** (slate-400, 2.6 : 1) — move all text uses to slate-500 (4.8 : 1)? Also rose-700 for the Out-of-service pill text. — color-palette §WCAG
23. **Dark mode** — adopt the proposed dark values, or leave light only? — color-palette tokens
24. **Arrow-key navigation** between tabs — wanted? — design §3.4
25. **Reduced motion** — shorten the 700 ms header fold under `prefers-reduced-motion`? — design §5
26. **One focus ring** (`focus-visible`) for all custom buttons? — design §6.2
27. **Escape** to close the row ⋮ menu and the Columns picker? — design §6.3
28. **Modals**: add `role="dialog"`, trap focus, return focus to the trigger on close? — design §6.3–6.4
29. **Touch targets**: the 28 px ⋮ button and 24 px status pill are below the 44 px guideline — enlarge on phones? — design §6.5

### Deliverables
30. **Figma**: someone with Figma access builds "01 – Account" from `design/figma/` and pastes the link into `design/figma-link.md` and the README.
