# 03 – Tickets · Instructions for an AI coding agent

You are building or maintaining the **Tickets** section of TrackSmart. Read this file first, then [page-overview.md](page-overview.md) (every view, field and state) and [design.md](design.md) (how it looks). The screenshots in [../screenshots/](../screenshots/index.md) are the visual truth; the walkthrough is [../video/tickets-walkthrough.mp4](../video/tickets-walkthrough.mp4). Where this file and the running app disagree, the app wins — report the difference.

---

## 1. Purpose

Tickets is the carrier's ledger of **driver tickets and offences** — paper and electronic citations from US (SMS / FMCSA) and Canadian (CVOR, NSC) enforcement:

- **List** — every ticket with citation #, driver, vehicles, location, violation, fine and status; category tabs by violation family; KPIs for money owed and court cases; a reconciliation banner listing regulator references that have **no ticket on file**.
- **Ticket detail** — the full record, its documents, a **review** that ends in a resolution sent to the driver (training, warning letter, safety alert, notice, termination, or dismissal), and its activity.
- **Add / Edit** — one six-section form: driver & vehicles, identifiers, location, violations & money, monitored dates, documents.

Open tickets feed **Compliance Monitoring** (due date and final date reminders). Everything is **scoped to one carrier**.

---

## 2. Tech stack

### 2.1 Current (the prototype you are maintaining)

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript 5.9, Vite 7, Tailwind CSS 4.1, lucide-react |
| Routing | One path, `/tickets`, held in `App.tsx` state. The detail page (`expandedId`) and the form (`isDialogOpen`) are component state inside `TicketsPage`; `useBackAwareView` lets browser Back close the detail. |
| Data | Seed per carrier (`carrier-tickets.data.ts`, synthesised from the carrier's "Citation Issued" violations + 14 legacy rows for Acme) merged with a localStorage store (`tickets.store.ts`, key `tracksmart_user_tickets_v1`); reviews in `record-review.ts` (`record-review-v1`); deliveries through `messages-store` |
| Roles | `roles.data.ts` key `tickets` (OFFICE row); gate in `App.tsx` |
| Build / check | `npx tsc -b` **and** `npx vite build` |

### 2.2 Target

**ASSUMPTION — TO CONFIRM:** React + TypeScript front end, a **Node.js REST API**, **MongoDB** with the collections in [../data/schema.md](../data/schema.md). `tickets.store.ts` and `record-review.ts` become thin clients of the API so the pages do not change.

---

## 3. File / component structure

### 3.1 Today (`src/pages/tickets/` unless noted)

```
TicketsPage.tsx            list, KPIs, category tabs, missing banner, sub-category cards, filters,
                           table + phone cards, row menu, delete dialog, share; hosts the detail and the form
TicketDetailPage.tsx       header, tiles, Overview · Documents · Review · Activity, monitored-date editing
TicketEditForm.tsx         the six-section wizard form (TicketFormDraft)
ViolationPicker.tsx        charge chips + SMS / CVOR / NSC code search (also used by hiring and roadside)
ticket-status.tsx          TICKET_STATUSES, tones, TicketStatusSelect (the pill is the editor)
ticket-vehicles.ts         vehicle 1 / 2 snapshots from the fleet; resolveTicketVehicle; vehicleLine
violation-presets.ts       CHARGE_PRESETS, PENALTY_OPTIONS, PRESET_CODES, violationFromCharge
tickets.data.ts            types (TicketRecord …), 14 legacy rows, defaultTicketMonitoring
tickets.store.ts           store, merge, add / update / remove, buildTicketFromViolation
carrier-tickets.data.ts    per-carrier seed + missing-reference reconciliation
ticket-from-application.ts tickets from a driver application's self-reported violations
src/components/ui/ReviewResolution.tsx · record-review.ts     shared review lifecycle
src/components/share/ResolutionSendDialog.tsx · RequestDelivery.tsx · ShareToChat.tsx
src/pages/compliance/warning-letters.ts                       warning letter filing
src/pages/compliance/monitoring-sources.ts (ticketAlerts)     Monitoring feed
```

### 3.2 To create for the target build

```
server/routes/tickets.ts             §5.1
server/routes/ticket-references.ts   §5.2 (missing-reference reconciliation)
server/routes/reviews.ts             §5.3 (shared with HOS, safety events, accidents)
server/services/ticket-alerts.ts     Monitoring feed (same rules as ticketAlerts)
server/services/warning-letters.ts   file a letter on the driver's compliance record
server/models/*.ts                   one per collection in data/schema.md
src/pages/tickets/tickets-api.ts     the only client; tickets.store.ts calls it
```

---

## 4. Behaviour you must preserve

1. **Carrier scope.** Every ticket belongs to one carrier; every list, KPI, tab and reference check is for the active carrier. **A ticket created from the form, the missing banner or a violation must get the carrier** (the prototype drops it — page-overview §11 #6).
2. **One citation number.** Typing the citation # sets `offenseNumber`, `identifiers.ticketNumber` and `identifiers.citationNumber` together; it is unique per carrier and the de-duplication key.
3. **Violations.** A ticket carries one or more charges (`violations[]`); the first is **Primary** and is mirrored into the flat `violationType / violationSubtype / violationCategory / violationGroup / isOos / identifiers.violationCode` that the list, tabs, filters and badges read.
4. **Vehicles.** Vehicle 1 (power unit) and vehicle 2 (trailer) are **snapshots** of the fleet record at the time (unit, plate, jurisdiction, VIN, label, kind); `assetId` mirrors vehicle 1.
5. **Money.** `fineAmount` and `legalExpense` are separate; total = fine + legal expense; currency per ticket (USD / CAD). **Never add USD and CAD together** (the prototype's Outstanding KPI does).
6. **Status.** Due · In Court · Paid · Closed; any change at any time; the pill saves at once. The form must save **Paid** as Paid (the prototype stores Due).
7. **Category tabs** are computed from category + type (regex rules in page-overview §2.1); tabs overlap.
8. **Monitoring.** Each Due / In Court ticket yields a "Ticket due date" alert and a "Final date" alert (each with its own reminders, default 30 / 15 / 7 days + on the day), or a court-date / status watch when neither date is set; subject = the driver; link opens the ticket.
9. **Review.** Every ticket starts "In Review": verify → one resolution → closed (reopen allowed). Delivered resolutions go through Messages (in-app chat, secure external link, or email). **Issue warning letter** also files a Warning Letter on the driver's compliance record. **Dismiss as false** closes without sending.
10. **Missing references.** Cross-check the carrier's citation-issued violations and regulator feeds (SMS, contraventions, CVOR / NSC convictions) against tickets by normalised reference; logging one must remove it from the list.
11. **Documents.** Five document types (Violation Ticket / Citation, Summons / Court Notice, Officer Violation Report, Fine Payment Receipt, Court Disposition / Judgment), each with number, date and files; the receipt sets the "receipt on file" flag. Editing must **keep** existing documents.
12. **Links.** Roadside inspections link a citation to a ticket; accidents cross-reference by accident # (store ids, not text); a driver application's incidents become Closed tickets.
13. **Navigation.** Detail opens over the list; Save / Cancel return to the list; Back closes the detail (and should close the form).

---

## 5. API (target build)

All routes under `/api/carriers/:carrierId/…`, authenticated, checked against the carrier and the role's `tickets` access (`full` for writes; `light` or `full` for reads). Errors: `{ error: { code, message, field? } }` — 400 validation, 401, 403, 404, 409 conflict, 422 rule broken.

### 5.1 Tickets
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/tickets` | query: `tab` (all / unsafe_driving / vehicle_maintenance / hos / driver_fitness / controlled_substances / other), `group`, `q`, `from`, `to`, `status`, `type`, `docType`, `source` (sms / cvor / nsc), `page`, `pageSize` (10 / 20 / 50 / 100) | `{ tickets, total, kpis: { total, outstandingByCurrency: {USD, CAD}, open, inCourt, paidThisMonth, electronic }, tabCounts, groupCounts }` | 403 |
| GET | `/tickets/:id` | — | `Ticket` + resolved vehicles + `review` | 404 |
| POST | `/tickets` | `TicketInput` (§6) | `201 Ticket` | 400; 409 citation # exists |
| PATCH | `/tickets/:id` | any subset of `TicketInput` | `Ticket` (+ activity "Item updated") | 400, 404, 409 |
| PATCH | `/tickets/:id/status` | `{ status }` | `Ticket` | 400 |
| PATCH | `/tickets/:id/dates/:which` (`due` / `final`) | `{ date: string \| null, monitoring }` | `Ticket` | 400 |
| DELETE | `/tickets/:id` | — | `204` (soft delete) | 404 |
| POST | `/tickets/:id/documents` | multipart: `docTypeId`, `docNumber`, `issueDate`, files[] | `TicketDocument` | 400 type not allowed / file too large |
| GET | `/tickets/:id/activity` | — | `ActivityEntry[]` (stored audit trail + review trail) | 404 |
| GET | `/tickets/export.csv` | same query as the list | `text/csv` | — |

### 5.2 Missing references
| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/ticket-references/missing` | `page`, `pageSize` | `{ refs: MissingTicketRef[], summary: { missingCount, onFileCount, perSource[] } }` |
| POST | `/ticket-references/sync` | — | `{ added: n, lastSyncedAt }` (pull from the regulator feeds) |
| POST | `/ticket-references/:refId/dismiss` | `{ reason? }` | `204` (persisted) |
| POST | `/ticket-references/log` | `{ refIds: string[] }` | `{ tickets: Ticket[] }` — each removed from the missing list |

### 5.3 Review (shared component, `subjectKind = "ticket"`)
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/reviews/ticket/:id` | — | `RecordReview` | — |
| POST | `/reviews/ticket/:id/verify` | — | `RecordReview` | 409 closed |
| POST | `/reviews/ticket/:id/notes` | `{ text }` | `RecordReview` | 400 empty |
| POST | `/reviews/ticket/:id/resolve` | `{ disposition: training\|warning\|alert\|notice\|terminated\|false, trainingName?, delivery?: { via: in-app\|external\|email, to?, subject, message } }` | `{ review, conversationId?, warningLetterId? }` | 400 invalid email / no course for training; 409 already closed |
| POST | `/reviews/ticket/:id/reopen` | — | `RecordReview` | 409 not closed |

---

## 6. Validation and security rules

- **Auth** on every route; roles are per carrier. **`tickets`**: Admin, Fleet Admin, Safety Manager full; **User light**; Driver hidden; Super Admin full. **Enforce light on the server** and disable the controls in the UI (the prototype only shows a banner).
- **TicketInput:** `offenseNumber` required, trimmed, unique per carrier · `date` required (ISO day), `time` HH:MM · `driverId` must be on the carrier's roster (or null with `driverName`) · `vehicle.assetId` / `vehicle2.assetId` must be the carrier's units · `location.country` USA / Canada, `state` in that country's list · `violations` ≥ 1, `code` must exist in the catalogue for the country · `fineAmount` ≥ 0 (2 decimals), `legalExpense` ≥ 0, `demeritPoints` integer ≥ 0 · `currency` USD / CAD · `status` one of four · `dueDate` / `finalDate` ISO days, `finalDate ≥ date` · `penalties` ⊆ Fine, Suspension, Revocation, Community Service, Other · `accidentId` / `roadsideInspectionId` must belong to the carrier.
- **Documents:** PDF / JPG / PNG, ≤ 20 MB each, virus-scanned; stored in object storage, not the database.
- **Resolution delivery:** email validated; external links signed and expiring; training needs a course; a warning letter is filed only for a roster driver.
- **Personal data:** licence numbers and VINs are personal / sensitive — return them only to full-access roles; never in share link previews.
- **Rate limits:** 60 writes / minute / user; `sync` 6 / hour / carrier.
- **Audit:** every write appends to the ticket's activity with user, role and timestamp (replacing today's generated trail).

---

## 7. Do's and don'ts

**Do**
- Keep the flat primary-violation fields in sync with `violations[0]` on every write.
- Keep money per currency end to end.
- Reuse the shared components: `ListPageHeader`, `SubTabs`, `KebabMenu`, `ShareToChat`, `ReviewResolutionTab` + `useRecordReview`, `ResolutionSendDialog`, `MonitoringToggle`, `ActivityTimeline`, `WizardEditor`, `ViolationPicker`.
- Make the Monitoring feed, profile insights and the driver profile read the **same** ticket query.
- Run `npx tsc -b` and `npx vite build` after every change.

**Don't**
- Don't let the citation document's number silently replace the citation # (it does today).
- Don't overwrite `ticketKind`, officer / court details or documents on edit.
- Don't generate activity entries that did not happen (the fixed "Dana Whitfield" entry).
- Don't add tickets without a carrier.
- Don't add toasts — the section's pattern is "the change shows where you land".

---

## 8. Acceptance checklist

- [ ] `npx tsc -b` and `npx vite build` pass.
- [ ] List matches [list-default](../screenshots/desktop/list/list-default-desktop.png): header, 7 category tabs with counts, 6 KPI cards, banner, sub-category cards, filters, table, pager; phone cards below 768 px.
- [ ] KPIs keep USD and CAD apart; Paid This Month uses a payment date.
- [ ] Status pill saves at once and the same value shows on the detail page and in Monitoring.
- [ ] Row ⋮: Open / Edit / Share / Delete; delete removes **any** ticket (soft delete) after "Remove this ticket?".
- [ ] Missing references: show / hide, select, bulk add, dismiss (persisted), sync; a logged reference disappears from the list.
- [ ] Detail: header, tiles, Overview (6 cards + jump-to-section), Documents, Review, Activity — matches [detail-overview](../screenshots/desktop/detail/detail-overview-desktop.png).
- [ ] Monitored dates edit in place and drive Monitoring alerts.
- [ ] Review: verify, notes, each of the six resolutions; delivered ones arrive in Messages; a warning letter is filed on the driver's record; reopen works.
- [ ] Form: six sections; Paid saves as Paid; a new ticket appears in the carrier's list; editing keeps documents, kind and court details.
- [ ] Light role cannot change anything (UI disabled and server 403); hidden role gets "Not in your menu".
- [ ] Browser Back closes the detail page and the form.
- [ ] Mobile 390 px: no page-level horizontal scroll; cards instead of the table — matches [list-default-mobile](../screenshots/mobile/list/list-default-mobile.png).
