# 02 – Inventory · Final check (Step 12)

Run on 2026-10-23 by a script over the whole folder (file presence, screenshot index ↔ files, every relative link and anchor in every `.md`, JSON validity, samples against schemas, video and PDF probes), plus the manual decisions below.

## Completion

| Check | Result |
|---|---|
| Every required file and folder exists | ✅ 20 / 20 — README, CHECKLIST, 3 docs, schema + 6 collection schemas + 6 sample files, palette (.json + .md), figma-link, Figma tokens + components, exports, screenshots index + 238 PNGs, video + script, PDF |
| Every tab covered | ✅ 4 / 4 — List, Drivers, Assets, Vendors each have a page-overview section, desktop and mobile screenshots, video captions and Figma key frames (7 · 7 · 1 · 3) |
| Every page behind the tabs covered | ✅ item page, Add / Edit item, Assign dialog, Item Category modal, Share, holder pages (driver + unit), Manage inventory (both steps + confirm), Messages collection card (office + driver), sign-form, vendor profile, Add / Edit Vendor, sidebar Vendors menu, view-only role |
| Screenshots | ✅ 238 (119 desktop at 1440 px, 119 mobile at 390 px); all named `[tab]-[state]-[device].png`; index lists 238, disk holds 238, 0 missing either way |
| Links | ✅ 360 relative links (incl. `#anchors`) across all markdown files checked — 0 broken |
| Data | ✅ 14 JSON files parse; 25 sample documents validate against their 6 collection schemas with 0 problems |
| Video | ✅ `video/inventory-walkthrough.mp4` — 3 min 21 s, 1920 × 1080, H.264; 32 timed captions in `video/script.md`, synced to the picture (recording offset trimmed) |
| PDF | ✅ `pdf/inventory-section.pdf` — 128 A4 pages, 32 MB, all 9 required parts |
| Personal data masked | ⚠️ **Not masked — by owner decision** (as for 01 – Account). Every name, address, email and phone number shown is fictional demo data from the prototype's test accounts. |
| Hosted | ➖ **Not hosted — by owner decision.** Step 11 skipped; no live URL, no `hosted-docs.png`. |
| Figma file | ⚠️ **Not created** — no Figma access in the documenting session. The import kit is complete (`design/figma/`, `design/exports/`, `design/figma-link.md`). |

States that exist but cannot be captured as images (opened native `<select>` lists, the empty / no-carrier states, the unlinked holder preset form) are listed with the reason in `screenshots/index.md`.

## TO CONFIRM — decisions needed from you

### Product behaviour
1. **Light role (Safety Manager)** sees "View only" but every Inventory control still works. Disable add / edit / assign / manage / delete in light mode, and refuse it on the server? — page-overview §9
2. **Status** is chosen by hand and never recomputed. Derive it from the expiry date (≤ 30 days = Expiring Soon, past = Expired)? — page-overview §10, schema
3. **Deleting an item** does not exist. Needed (as a soft delete that keeps the trail and filed receipts)? — page-overview §11
4. **List KPI tiles** do nothing when clicked, while the Drivers / Assets / Vendors tiles filter. Make them filters? — page-overview §2.2
5. **Categories** added or changed in the modal are not saved and are ignored by the rail and the item form. Persist them per carrier? Built-ins read-only? — page-overview §2.9, schema
6. **"Company Issued" placeholder vendors** (36 per carrier) appear on the Vendors tab. Hide them, and model them as a flag instead of rows? — page-overview §8.1, schema
7. **Vendors** added / edited / deleted live in memory only, and a new vendor is missing from the item form. Persist and share one store? — page-overview §8
8. **Vendor Name, Status and Category** cannot be edited, so no vendor can be made Inactive. — page-overview §8.4
9. **Deleting a vendor** is not blocked while items or work orders still use it. Block, or reassign? — page-overview §8.1
10. **Recurrence** ("Renews annually") is shown but nothing rolls dates forward. Auto-renew? — page-overview §3.1
11. **A driver who leaves** — keep their items on them until the hand-back is confirmed (assumed), or clear immediately? — schema relationships

### Defects seen in code (fix, or confirm as intended)
12. **Unassigning a seeded item does not stick** (the stored patch drops `undefined`, so the seed assignment returns). — page-overview §2.8, §6
13. **Item page ignores edits to seeded items**, although Save lands there. — page-overview §3.1
14. **Item page Category** shows the vendor's category, not the item's own. — page-overview §3.1
15. **Holder page title** is the raw id ("DRV-001-0001"), not the name / unit number. — page-overview §5
16. **A holder with nothing** gets "That driver is no longer here" instead of an empty page. — page-overview §5
17. **Vendor profile** shows the record as it was before an edit, its Edit / Share buttons are not shown, its Inventory tab lists seeded items only and rows open the List rather than the item. — page-overview §8.2
18. **Vendor profile from Inventory** highlights **Maintenance** in the sidebar (it lives under `/maintenance/vendors`). — page-overview §8.2
19. **Edit with an unknown id** silently creates a new item. — page-overview §3.2
20. **Edit Vendor** stores Country "USA" while the data uses "United States"; the whole dialog scrolls, so Save scrolls away. — page-overview §8.4
21. **Add Vendor breadcrumb** always says "Acme Trucking Inc.". — page-overview §8.3
22. **Holder share links** may not open the holder. — page-overview §4
23. **Top-bar title** reads "TrackSmart" on item and holder pages. — page-overview §0

### Validation, data and security (rebuild)
24. **Item form**: enforce Category / Record name / Status (marked required), expiry ≥ issue date, unique Number per carrier; show inline errors instead of a silently disabled Save? — page-overview §3.2, agent §6
25. **Target stack**: Node.js REST API + MongoDB, as assumed in agent.md §2.2?
26. **`carrierId` on items** (the prototype infers the carrier) — add it? — schema
27. **Receipts** as their own immutable `signed_receipts` documents, with the compliance record pointing at them? — schema
28. **PINs** (fuel cards, gate cards) visible to full-access roles only, and never in share payloads or logs? — agent §6
29. **Alert assignee** is shown on the item page when set, but nothing sets it. Add it to the form? — page-overview §3.1

### Design and accessibility
30. **Inter 700** is not loaded but `font-bold` is used (synthesised bold). Load 700 or map bold to 600? — design §2
31. **Hard-coded `#2563EB` / `#F8FAFC`** (Tailwind v3 values) in Add Vendor — replace with `bg-blue-600` / `bg-slate-50`? — color-palette notes
32. **slate-400 text** ("no expiry", dashes, placeholders) fails contrast (2.6 : 1); move text uses to slate-500. Also rose-600 on rose-50 for rows coming off. — color-palette §WCAG
33. **Dark mode** — adopt the proposed dark values, or stay light-only? — color-palette tokens
34. **Assign dialog** does not close on Esc and no dialog except the category alertdialog sets `role="dialog"` / traps focus. Fix both? — design §6.3–6.4
35. **One `focus-visible` ring** for every custom button? — design §6.2
36. **Disabled-button reasons** live only in tooltips (unreachable by touch / screen reader). — design §6.5
37. **Touch targets**: the 28 px ⋮ and ✎ buttons are below 44 px on phones. — design §6.5

### Deliverables
38. **Figma**: someone with Figma access builds "02 – Inventory" from `design/figma/` and pastes the link into `design/figma-link.md` and the README.
39. **Empty-carrier and no-carrier states** — add a demo carrier with no inventory so they can be captured. — screenshots/index.md
