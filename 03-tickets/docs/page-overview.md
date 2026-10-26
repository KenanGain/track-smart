# 03 – Tickets · Page Overview

**App:** TrackSmart (fleet compliance prototype) · **Section:** sidebar menu "Tickets" · **Documented:** 2026-10-23 · **Source of truth:** the running app (test accounts only) cross-checked against `src/pages/tickets/*` and the shared review / share components.

> Everything below exists in the app today. Anything not seen on screen is marked **ASSUMPTION:** (inferred from code) or **TO CONFIRM:** (needs a product decision or a check I could not make). Demo figures are for the carrier **Acme Trucking Inc.** (`acct-001`). **Acme's ticket list is regenerated on every page load** (its source violations use `Math.random()`), so totals drift between about 301 and 313 (305 when these screenshots were taken); only the 14 legacy tickets OFF-84729 … OFF-84742 are stable (TO CONFIRM §11 #1).

---

## 0. Entry point and frame

| Item | Value |
|---|---|
| Sidebar item | **Tickets** (icon: ticket), between Accidents and Beta Safety Analysis; menu group "Safety" |
| Route | `/tickets` only. The ticket detail page and the add / edit form are **states of the same page** (`expandedId`, `isDialogOpen`); the URL never changes and a reload lands on the Dashboard. |
| Top-bar title | "Tickets" |
| Carrier scope | One carrier — the top-bar **Switch carrier** selection or the user's default. Every KPI, tab, filter and the missing-references banner is scoped to it. |
| Header | `ListPageHeader`: ticket icon · **Tickets & Offenses** + count pill (all tickets, tooltip "{n} records") · "**{carrier legal name}** · Paper & electronic citations" · **Export** · **Add Ticket**. Condenses on scroll (title shrinks, description folds, KPI chip strip appears); the category tabs never scroll away. |
| Back button | The detail page registers with browser history: Back closes it. The form does not (Back while the form is open leaves the page — TO CONFIRM). |

### Page-level states

| State | What the user sees |
|---|---|
| **Loading** | None — local data renders immediately. |
| **View-only (light)** | Blue strip "**View only** · a User can look at Tickets here but not change it." The page reads no role, so every control still works (TO CONFIRM §11 #2). |
| **No access (hidden)** | "Not in your menu" page with **Go to Dashboard** (drivers never reach `/tickets`). |
| **Success** | No toasts. A save returns to the list; a status change shows at once. |
| **Error** | No custom field errors. Only the browser's own number-field bubbles (e.g. negative fine) and "Enter a valid email address." in the resolution dialog. |

---

## 1. Tree (what exists inside Tickets)

```
Tickets  (/tickets)
├── List
│   ├── Header                     [Export (no-op)] [Add Ticket → Add form]
│   ├── Category tabs              All Tickets · Unsafe Driving · Vehicle Maintenance · Hours-of-Service ·
│   │                              Driver Fitness · Controlled Substances · Other
│   ├── KPI cards (6)              Total Tickets · Outstanding · Open Offenses · In Court · Paid This Month · Electronic
│   ├── Missing-references banner  [Sync feeds] [Show missing ⌄] → missing table (select · + Add · Dismiss · + Add N to tickets)
│   ├── Sub-category cards         up to 12 violation groups in the tab (click = filter)
│   ├── Filters                    Search · From / To date · Status · Type · Document · Source · Reset filters
│   ├── Table (≥ md) / cards (< md)  Citation # · Date · Driver · Vehicle · Location · Violation · Fine · Status (editable) · Docs · ⋮
│   │   ├── row click              → Ticket detail
│   │   └── ⋮  Open ticket · Edit ticket · Share to chat · Delete ticket ("Remove this ticket?")
│   └── Pager                      10 / 20 / 50 / 100 per page
├── Ticket detail                  (row click)
│   ├── Header                     Back · title · kind chip · meta · status pill · [Share to chat] [Edit Ticket] [⋮ Edit · Delete]
│   ├── Tiles                      Status · Fine · Ticket due date · Final date
│   └── Tabs                       Overview (6 cards + Jump to section) · Documents · Review · Activity
│       └── Review                 Verify → resolution: Assign training · Issue warning letter · Send safety alert ·
│                                  Send driver notice · Terminate driver · Dismiss as false → "Send & close review" dialog
└── Add / Edit ticket              (full-page wizard)
    ├── 1 Driver & Vehicles        Driver · Vehicle 1 — power unit · Vehicle 2 — trailer
    ├── 2 Identifiers & Date       Citation # · Microfilm # · Date · Time · Linked accident #
    ├── 3 Location                 Street · City · Zip · Country · State / Province
    ├── 4 Violation & Fine         Violation picker · commercial vehicle · out of service · penalties · status · fine ·
    │                              demerit points · legal expense · currency · total
    ├── 5 Dates & Monitoring       Ticket due date + alert · Final date + alert
    └── 6 Ticket Documents         5 document types, each: number · date · files
```

---

## 2. List

**Purpose.** The carrier's ledger of driver tickets and offences — paper and electronic citations — with what is owed, what is in court, and which regulator references still have no ticket on file.

### 2.1 Category tabs
`SubTabs` (aria "Ticket categories"), zero counts shown. Each tab is a regex over the ticket's category + type, so tabs overlap and their counts add up to more than the total.

| Tab | Matches | Acme (one load) |
|---|---|---|
| All Tickets | everything | 305 |
| Unsafe Driving | unsafe driving · speeding · red light · parking · reckless | 9 |
| Vehicle Maintenance | vehicle maintenance · equipment defect · overweight | 268 |
| Hours-of-Service | hours-of-service · hos · logbook | 59 |
| Driver Fitness | driver fitness · insurance | 35 |
| Controlled Substances | controlled substance · alcohol · drug | 4 |
| Other | none of the above | 0 |

Changing tab clears the sub-category filter, resets the pager and closes any open ticket.

### 2.2 KPI cards
Grid 2 → 3 (`sm`) → 6 (`xl`). Computed over **every** ticket of the carrier (tab, filters and search are ignored). **Not clickable.**

| Card | Value | Sub-line |
|---|---|---|
| Total Tickets | count | — |
| Outstanding | Σ fine + legal expense of Due + In Court tickets — **USD and CAD added together under "$"** (TO CONFIRM §11 #5) | "Due + In Court" |
| Open Offenses | count of Due | "Status: Due" |
| In Court | count of In Court | "Awaiting hearing" |
| Paid This Month | Paid tickets whose **issue date** is in the current month (no payment date exists) | "Recent closures" |
| Electronic | count of eTickets | "{n}% eTickets" |

The condensed header shows OUTSTANDING · OPEN · IN COURT · PAID · ETICKETS as chips.

### 2.3 Missing-references banner
Cross-checks the carrier's regulator references against the tickets on file.

| Part | Detail |
|---|---|
| Heading | amber bell "**{n} ticket references missing**" — or green shield "All ticket references reconciled" |
| Sub-line | "**{n}** on file · Cross-checked against Violation Log (…), SMS (…), Contrav. (…), CVOR Conv. (…), NSC AB Conv. (…), NSC NS Conv. (…), NSC PEI Conv. (…)" — each source tooltip "{agency} — N verified, M missing" |
| **Sync feeds** | pulls 1–3 new references from the regulator feeds (in memory) and opens the list; tooltip "Pulls a fresh batch from the regulator feeds" / "Last synced {time}" |
| **Show missing ⌄ / Hide missing ⌃** | toggles the missing table |
| Missing table | ☐ · **Source / Date** (source chip, date, time) · **Driver** (+ "DL …") · **Violation** (code chip + severity chip OOS / Critical / Serious / Moderate / Minor, description) · **Reference** ("Ticket #", "Citation #" or "Conviction #", city / state, "Convicted {date}") · **+ Add** · **×** Dismiss |
| Row click / + Add | opens the Add form pre-filled from the reference ("Click to log this ticket with pre-filled details") |
| Bulk bar | "{n} references selected" · Clear · **+ Add {n} to tickets** |
| Pager | Rows per page 5 / 10 / 20 / 50 · "1-10 of {n}" · "1 / {pages}" |

Dismissed rows and synced references are kept in memory only. Adding a missing reference does **not** remove it from the banner (TO CONFIRM §11 #8).

### 2.4 Sub-category cards
"SUB-CATEGORIES — VIOLATION GROUPS IN THIS VIEW · Click a card to narrow the table to that violation group". Up to 12 cards (group · count · % of the tab · bar), grid 2 / 3 / 4 / 6. Clicking toggles the filter (card turns dark; **Clear sub-filter ✕** appears). Empty tab: "No tickets in this category for the current dataset."

### 2.5 Filters
| Control | Detail |
|---|---|
| Search | "Search ticket citation #, driver, vehicle, location…" — citation #, driver, vehicle id, location, ticket # and citation # |
| From date / To date | date inputs (each limits the other); match on the issue date |
| Status | All Statuses · Due · In Court · Paid · Closed |
| Type | All Types · Speeding · Overweight · Logbook violation · Equipment defect · Insurance lapse · Red Light · Parking |
| Document | All Documents · Violation Ticket · Electronic Ticket · Summons / Court Notice · Officer Report · Fine Receipt · Court Disposition |
| Source ("Filter by regulator source") | All Sources · SMS (FMCSA) · CVOR (Ontario) · NSC (Canada) — derived from the province in the location |
| **Reset filters** | shown while search, status, type, document or a date is set (**not** for Source or a sub-category alone — TO CONFIRM); resets all of them |

There is no column picker, grouping or sort.

### 2.6 Table (≥ 768 px)
`min-w-[1400px]`, horizontal scroll, first and last columns pinned. Order = store order (edited / added tickets first).

| Column | Content |
|---|---|
| TICKET CITATION # | blue citation number + kind badge **PAPER** (blue) / **eTicket** (violet) |
| DATE | date + time (hidden when 00:00) |
| DRIVER | name |
| VEHICLE | "UNIT · PLATE (JUR)", "+ unit" for a trailer |
| LOCATION | "City, ST" |
| VIOLATION | type badge (Speeding red, Overweight orange, Logbook violation purple, Equipment defect slate, Insurance lapse pink, Red Light red, Parking slate) + subtype + "+N" + **OOS** chip |
| FINE | "CA$250.00" / "$1250.00" (tooltip adds legal expense) |
| STATUS | **editable pill** (native select "Ticket status", title "Change status"): Due amber · In Court blue · Paid emerald · Closed slate — saves at once |
| DOCS | three icons — Offense ticket · Payment receipt · Notice of trial — coloured when on file |
| ACTIONS | ⋮ "Actions for {citation}": **Open ticket** · **Edit ticket** · **Share to chat** · **Delete ticket** |

**Phone (< 768 px):** one card per ticket — citation + badges + ⋮, violation line, DRIVER / VEHICLE / DATE / LOCATION, fine, doc icons and the status pill.

**Pager:** "Showing 1 – 20 of {n}" · 10 / 20 (default) / 50 / 100 per page · Prev · "Page 1 / 16" · Next.

**Empty:** "No tickets found matching your criteria."

### 2.7 Dialogs from the list
| Dialog | Detail |
|---|---|
| **Remove this ticket?** | "Ticket citation **{n}** will be removed from your ledger. This cannot be undone." · Cancel · **Remove ticket** (rose). For a seeded ticket nothing visible happens (only an edited copy is removed — TO CONFIRM §11 #4). |
| **Share Ticket {n}** | "Send the record + documents in a chat, or to an outsider by email" · Send via In-app chat ("TrackSmart user · app") / External chat ("Secure link · they reply") / Email ("One-way · no reply") · recipient · Subject · Message · Attachments ("No documents yet") · **Share in chat** / **Send & create chat** / **Email documents**. The message carries a record link that opens the ticket. |

Deep links into a ticket: Compliance Monitoring alerts ("Open in Tickets"), the Roadside Inspection citation link, chat record links and the AI-agent ticket rows open the list straight on that ticket's detail.

---

## 3. Ticket detail

**Purpose.** One ticket as a full page: who, which vehicles, where, what charges, what it costs, when it is due, its documents, its review and its history.

### 3.1 Header
| Element | Detail |
|---|---|
| Strip | "‹ Back to Tickets" · Tickets › {citation} |
| Identity | ticket tile with a status dot · **Ticket {citation}** · **Paper ticket** / **eTicket** chip · **OOS-qualifying** (when set) |
| Meta | driver · vehicle (+ trailer) · date · time · location · **status pill** |
| Sub-line | violation subtype · "+N more" |
| Actions | **Share to chat** (icon-only below `sm`) · **Edit Ticket** ("Edit" below `sm`) · ⋮ More actions: Edit ticket · Delete ticket |
| Tiles | **Status** (pill + "Fine outstanding" / "Awaiting hearing" / "Settled" / "Nothing left to do") · **Fine** ("$250.00 USD"; "+ $X legal expense · total $Y" or "No legal expense recorded") · **Ticket due date** ("Overdue · N days ago" / "Due in N days" + "· monitored") · **Final date** ("Passed · N days ago" / "in N days") |
| Tabs | **Overview** · **Documents {n}** · **Review** · **Activity {n}** |

### 3.2 Overview
Six cards with a **Jump to section** rail (≥ 1024 px) or a floating **Sections** button (phones):

1. **Driver & Vehicles** — Driver · Driver ID · Driver licence · **Vehicle 1 — power unit** and **Vehicle 2 — trailer** (Unit #, Vehicle, Plate, Jurisdiction, VIN — or "Not on this ticket").
2. **Where & when** — Date · Time · Location · Description.
3. **Violation** — Type · Code · Statute section · Description · Category · Sub-category · "All violations · N" (first = **Primary**, code, category, OOS).
4. **Identifiers** — Ticket citation number · Microfilm number · Linked accident # · Docket # · Court case # · Receipt # · USDOT · CVOR / NSC.
5. **Paper ticket detail** (Officer · Officer badge · Court location · Court date) or **Electronic ticket detail** (Portal URL · QR reference · Issuing device).
6. **Money, dates & status** — two **monitored-date cards** (click to edit: date + Monitoring & Notifications + Cancel / Save; "Monitoring on / off", "Reminders 30, 15, 7 days before + on the date · via email, in-app") · Fine · Legal expense · **Total** · Status · Currency · Demerit points · Out of service · Commercial vehicle · Penalty / fine.

### 3.3 Documents
"Ticket documents" with indicator chips **Ticket file · Receipt · Notice**. One card per attached document (type name, "#number · date", "N files", file names and sizes). Empty: "No documents attached · Attach the ticket, summons, officer report or receipt from the edit form." View only — upload happens in the form.

### 3.4 Review
- **Citation under review** — Driver · Ticket citation # · Violation · Date · Location · Fine.
- **Review & resolution** (status pill In Review / Closed). Every ticket starts **In Review**:
  - **1 · Verify** — **Mark as verified** → "Verified by {reviewer}".
  - **2 · Resolution — action to take** — **Assign training** · **Issue warning letter** · **Send safety alert** · **Send driver notice** · **Terminate driver** · **Dismiss as false**.
  - **Add note** — "Write a review note…" · Cancel · Save note → "Review notes".
  - Closed: disposition chip, "Closed by {reviewer}", **Reopen for review**, Add note.
- **Dismiss as false** closes at once. The other five open the **resolution dialog**:

| Part | Detail |
|---|---|
| Header | disposition title · "To {driver} · Ticket {citation} · {violation}" |
| Send via | In-app chat (default) · External chat · Email |
| Send to | driver chat chip, or an email (prefilled from the roster) — "Enter a valid email address." |
| Course | training only: HOS / ELD Refresher · Fatigue Management · Log Auditing & Corrections · Hours-of-Service Rules (US) · Hours-of-Service Rules (Canada) · Trip Planning & Scheduling · Defensive Driving |
| Subject / Message | prefilled per resolution ("Warning letter — Ticket OFF-… · …", "Hi {first}, a formal warning letter has been issued to your file for …") |
| Warning note | "The warning letter is filed to the driver’s compliance record with this citation’s details, and a copy goes with this message." |
| Footer | "Delivered through Messages · closes the review with this resolution." · Cancel · **Send & close review** |
| Sent | "{Resolution} — sent" · "Delivered to {driver}'s chat in the app. The record is closed with this resolution." · Done · Open in Messages |

A warning letter is also filed on the driver's compliance record (only when the driver is on the carrier's roster), shown as an amber banner on the Review tab.

### 3.5 Activity
Timeline, newest first: Ticket issued (Citation) · Recorded in system · Opened by office · one "… uploaded" per file on record · Shared with driver · Linked to accident · Assigned to third party · Note added · Status — {status}, followed by the reviewer's entries (Verified, Closed — …, notes, Reopened). The first entries are **generated from the record on every view**, not stored (e.g. the office clerk is always "Dana Whitfield" — TO CONFIRM §11 #9).

---

## 4. Add / Edit ticket  (`TicketEditForm.tsx`)

**Purpose.** Log a ticket, or change one. Full-page wizard: "← Back to tickets" · **Add Driver Ticket** ("Log a driver ticket — record the offense, violation, fine and supporting documents.") / **Edit Ticket** ("ID: {id}") · **Cancel** · **Save Ticket**. Left rail "Progress · Complete each section" with six steps (counts, check marks, click to scroll) — hidden below `md`.

| § | Field | Type | Rules / options |
|---|---|---|---|
| 1 Driver & Vehicles | Driver | select ("Select Driver...") | roster; fills licence and, if empty, Vehicle 1 from the driver's current unit; "Licence {no} · from the driver record" |
| | Vehicle 1 — power unit | select ("Select the unit…") | fleet, power units first; info box Unit · Plate · Jurisdiction · VIN · Vehicle ("Filled in from the fleet record") |
| | Vehicle 2 — trailer (optional) | select ("None / not applicable") | fleet, trailers first |
| 2 Identifiers & Date | Ticket citation number | text ("e.g. OFF-84741 or CT-IL-12345") | default "OFF-{next}"; also stored as ticket # and citation # |
| | Microfilm number · optional | text ("Court archive reference, if printed") | — |
| | Date · Time | date · time | default now |
| | Linked accident # | text + suggestions ("Link an accident (e.g. ACC-2026-0001)") | free text, no check |
| 3 Location | Street Address · City · Zip / Postal Code | text | — |
| | Country | select United States / Canada | resets State; switches the code list US SMS ↔ Canadian CVOR/NSC |
| | State / Province | select ("Select...") | 50 states or 13 provinces / territories |
| 4 Violation & Fine | Violation type (picker) | chips + code search | charges: Speeding · Improper Lane Change · Failure to Yield · Following Too Closely · Running Red Light / Stop Sign · Distracted Driving · Improper Turn · Failure to Obey Traffic Control; or "Search SMS violation code..." (Canada: "Search Canadian violation code..."); "Selected violations · N" with **Primary**, code, category, group, OOS-qualifying, × Remove; empty "No violations yet — pick a charge above or search a code." |
| | Were you in a commercial vehicle? · Out of Service? | Yes / No (click again to clear) | — |
| | Penalty / Fine · select all that apply | chips | Fine · Suspension · Revocation · Community Service · Other |
| | Ticket Status | select | Due (default) · In Court · Paid · Closed — **"Paid" saves as Due** (TO CONFIRM §11 #3) |
| | Fine Amount · Legal expense | number (min 0, 0.01) | "Legal expense" = "Lawyer, paralegal and court costs on top of the fine" |
| | Demerit Points | number (min 0, 1) | — |
| | Currency | select USD / CAD | — |
| | Total | read-only | fine + legal expense (always shows "$") |
| 5 Dates & Monitoring | Ticket due date | date + Monitoring & Notifications | "Pay the fine or answer the ticket by this date."; default alert on, 30 / 15 / 7 days + on the date, email + in-app |
| | Final date | date + Monitoring & Notifications | "The court date or last deadline — after it, nothing more can be done." |
| 6 Ticket Documents | Violation Ticket / Citation · Summons / Court Notice · Officer Violation Report · Fine Payment Receipt · Court Disposition / Judgment | switch per type → Ticket number ("e.g. CIT-2025-00123") · Date · files (PDF / JPG / PNG, several; names only) | turning a type off removes it |

**Validation:** none of the app's own; only the browser's number checks (min 0, decimals). **Save** builds the ticket, adds it (or updates the edited one) and returns to the **list** (also from the detail page); no toast. **Cancel / Back** returns to the list without asking. Known effects of the current save (TO CONFIRM §11 #3, #6, #7): a new ticket gets no carrier and may not show in the carrier's list; a citation document's number replaces the citation #; editing an eTicket turns it into a Paper ticket and clears officer / court details; the form opens with all document switches off, so saving an edit drops existing documents; the street field is seeded from the description, so the description grows with each edit.

---

## 5. Roles and visibility

| Menu (key) | Admin | Fleet Admin | Safety Manager | User | Driver |
|---|---|---|---|---|---|
| Tickets (`tickets`) | Full | Full | Full | **Light** | Hidden |

Super Admin is always Full. Light shows the "View only" strip but does not disable anything. Drivers never reach `/tickets` (their allowed paths are the Driver Mobile App, Messages, their profile, Apply for Carrier and the inventory sign-form).

---

## 6. Shared behaviours and storage

| Behaviour | Detail |
|---|---|
| Status | Due · In Court · Paid · Closed — any change allowed at any time (pill on list, detail header, Status tile, money card) |
| Monitoring feed | Each Due / In Court ticket raises up to two alerts on Compliance Monitoring — **Ticket due date** and **Final date** (or a court-date / status watch when neither is set) — source "Tickets & violations", subject = driver, link "Open in Tickets" |
| Review | Shared with HOS violations, safety events and accidents (`record-review`): verify → resolution → reopen; resolutions are delivered through Messages; a warning letter is filed on the driver's compliance record |
| Links | Roadside inspections link a citation to a ticket; accidents and tickets cross-reference by number (text only); saving a violation with a citation can create a ticket; a driver application's self-reported violations become Closed tickets |
| Persistence (prototype) | localStorage `tracksmart_user_tickets_v1` (added tickets + edited copies of seeded ones), `record-review-v1` (reviews), `messages:conversations:v3` (shares, resolutions), `compliance-data-v3` (warning letters). Missing-reference dismissals and synced feeds are in memory only. |

---

## 7. Not in the UI

- **Export** button does nothing.
- No column picker, grouping or sort on the list; KPI cards are not filters.
- No payment date (Paid This Month uses the issue date).
- No document upload or download outside the form.
- No stored audit log for the ticket itself (the Activity tab is generated).
- The driver profile's Tickets tab (in Account) reads only the 14 legacy tickets.

---

## 11. TO CONFIRM (open questions)

1. **Acme's seed is random per load** (counts 301–313; synthesised tickets change content and ids). Give seeds stable ids.
2. **Light role (User)** sees "View only" but can add, edit, delete, change status, review and share. Disable in light mode and refuse on the server?
3. **Form status "Paid" saves as "Due"** (status inference) — the pill saves Paid correctly.
4. **Delete** does nothing for a seeded ticket (only an edited copy is removed). Soft delete for every ticket?
5. **Outstanding KPI** adds USD and CAD together under "$". Show per currency?
6. **A ticket added from the form, the missing banner or a violation gets no carrier**, so it does not show in the carrier's list.
7. **Editing a ticket** turns an eTicket into Paper, clears officer / court details, drops attached documents (switches start off) and grows the description.
8. **Adding a missing reference** does not remove it from the banner.
9. **Activity tab** is generated (fixed clerk "Dana Whitfield", fixed note). Store a real audit trail?
10. **Paid This Month** uses the issue date — add a payment date?
11. **Fine Payment Receipt** attached in the form never sets the receipt flag.
12. **Reset filters** is not shown when only Source or a sub-category is set.
13. **Driver profile Tickets tab** reads the static legacy list instead of the carrier's tickets.
14. **Warning letters** are filed only for roster drivers (the legacy drivers John Smith etc. are not on the roster, so no letter is filed for them).
15. **Back button** while the form is open leaves the page instead of closing the form.
16. **Review** is attributed to "Safety Manager" (the signed-in user's name is not passed to the page).
17. **Missing-reference dismissals and synced feeds** are lost on navigation. Persist them?
18. **Export** — CSV of the visible rows?
