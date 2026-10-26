# 03 – Tickets · Final check (Step 12)

Run on 2026-10-23 by a script over the whole folder (file presence, screenshot index ↔ files, every relative link and anchor in every `.md`, JSON validity, samples against schemas, video and PDF probes), plus the manual decisions below.

## Completion

| Check | Result |
|---|---|
| Every required file and folder exists | ✅ 20 / 20 — README, CHECKLIST, 3 docs, schema + 4 collection schemas + 4 sample files, palette (.json + .md), figma-link, Figma tokens + components, exports, screenshots index + 109 PNGs, video + script, PDF |
| Every view covered | ✅ 3 / 3 — List, Ticket detail, Add / Edit each have a page-overview section, desktop and mobile screenshots, video captions and Figma key frames (7 · 7 · 4) |
| Every part of each view covered | ✅ category tabs, KPI cards, missing-references banner (show, select, sync), sub-category filter, every filter, row menu, share (in-app / external), delete; detail Overview, monitored-date edit, Documents (filled / empty), Review (verify, note, resolution dialog in-app / email / training, sent, closed), Activity, share, header menu, eTicket variant; form — all six sections, code search, native validation, edit + save; view-only role |
| Screenshots | ✅ 109 (54 desktop at 1440 px, 55 mobile at 390 px — the phone-only "Sections" menu is the extra one); all named `[tab]-[state]-[device].png`; index lists 109, disk holds 109 |
| Links | ✅ 210 relative links (incl. `#anchors`) across all markdown files checked — 0 broken |
| Data | ✅ 10 JSON files parse; 16 sample documents validate against their 4 collection schemas with 0 problems |
| Video | ✅ `video/tickets-walkthrough.mp4` — 2 min 11 s, 1920 × 1080, H.264; 21 timed captions in `video/script.md`, synced to the picture |
| PDF | ✅ `pdf/tickets-section.pdf` — 80 A4 pages, 18.7 MB, all 9 required parts |
| Personal data masked | ⚠️ **Not masked — by owner decision** (as for 01 and 02). Every name, address, email and phone number shown is fictional demo data from the prototype's test accounts. |
| Hosted | ➖ **Not hosted — by owner decision.** Step 11 skipped. |
| Figma file | ⚠️ **Not created** — no Figma access in the documenting session. The import kit is complete (`design/figma/`, `design/exports/`, `design/figma-link.md`). |
| Capture note | One demo ticket (OFF-84729) was filled in through the app's own ticket store before the detail captures and the video, so the detail page shows documents, a trailer and two charges. Stated in `screenshots/index.md` and `video/script.md`. |

## TO CONFIRM — decisions needed from you

### Product behaviour
1. **Light role (User)** sees "View only" but can add, edit, delete, change status, review and share. Disable in light mode and refuse on the server? — page-overview §5
2. **Export** does nothing. CSV of the visible rows? — page-overview §7
3. **Outstanding KPI** adds USD and CAD together under "$". Show per currency? — page-overview §2.2
4. **Paid This Month** uses the issue date (no payment date exists). Add `paidAt`? — page-overview §2.2, schema
5. **KPI cards** are not filters. Make them clickable like other lists?
6. **Delete** does nothing for a seeded ticket (only edited copies are removed). Soft delete for every ticket? — page-overview §2.7
7. **Missing references**: logging one does not remove it from the banner; dismissals and synced references are lost on navigation. Persist and match? — page-overview §2.3, schema
8. **Activity tab** is generated on every view (fixed "Dana Whitfield" entry, fixed note). Store a real audit trail? — page-overview §3.5, schema
9. **Review attribution** is always "Safety Manager" — use the signed-in user? — page-overview §11 #16
10. **Warning letters** are filed only for drivers on the roster (legacy demo drivers are not). — page-overview §3.4

### Defects seen in code
11. **Acme's ticket list is regenerated randomly on every page load** (301–313 tickets; synthesised tickets change content). Stable seed ids? — page-overview header, schema
12. **Form status "Paid" saves as "Due".** — page-overview §4
13. **A ticket added from the form, the missing banner or a violation gets no carrier** and does not appear in the carrier's list. — page-overview §4, agent §4
14. **Editing a ticket** turns an eTicket into Paper, clears officer / court details, drops attached documents (switches start off) and grows the description; a citation document's number replaces the citation #. — page-overview §4
15. **Fine Payment Receipt** attached in the form never sets the "receipt on file" flag. — page-overview §11 #11
16. **Reset filters** is not shown when only Source or a sub-category is set. — page-overview §2.5
17. **Browser Back** while the form is open leaves the page. — page-overview §0
18. **Driver profile Tickets tab** (Account) reads only the 14 legacy tickets. — page-overview §7
19. **Table rows** are not keyboard-focusable (only the ⋮ menu reaches a ticket by keyboard). — design §6.2

### Data and security (rebuild)
20. **Target stack**: Node.js REST API + MongoDB, as assumed in agent.md §2.2?
21. **Required `carrierId`, structured location, ids instead of free-text links** to accidents and roadside inspections. — schema
22. **Validation** the form lacks today: citation # required and unique, at least one violation, final date ≥ issue date, state in the country's list. — agent §6
23. **Licence numbers and VINs** visible to full-access roles only. — agent §6

### Design and accessibility
24. **slate-400 text** (KPI sub-lines, dashes) fails contrast (2.6 : 1); move to slate-500. — color-palette §WCAG
25. **Inter 700** not loaded (synthesised bold). — design §2
26. **Status / Type filter selects have no label**; dialogs other than the resolution dialog lack `role="dialog"`. — design §6.3
27. **Touch targets**: ⋮ (28 px) and the doc icons are below 44 px on phones. — design §6.4
28. **Dark mode** — adopt the proposed dark values? — color-palette tokens

### Deliverables
29. **Figma**: someone with Figma access builds "03 – Tickets" from `design/figma/` and pastes the link into `design/figma-link.md` and the README.
