# 03 – Tickets · Data model (MongoDB)

What the Tickets section stores, collection by collection, with the fields the UI reads and writes, how the collections point at each other and at Account's, and the indexes the list, tabs, KPIs, reconciliation and Monitoring need. One JSON Schema per collection is in [collections/](collections/) and 3–5 fictional sample documents per collection in [sample-data/](sample-data/). All three are generated from one definition, so they cannot drift.

Conventions: calendar days (`date`, `dueDate`, `finalDate`) are `YYYY-MM-DD` strings; timestamps are ISO date-times. Every document belongs to one `carrierId` and every query starts with it. Money is stored per ticket with its currency and never summed across currencies. Clearing a field is `$unset` or `null`.

> **ASSUMPTION:** the prototype has no database; this model is derived from the TypeScript types it uses today (`TicketRecord`, `TicketViolation`, `TicketVehicle`, `TicketIdentifiers`, `MissingTicketRef`, `RecordReview`) and from the form in [../docs/page-overview.md](../docs/page-overview.md). Where the model improves on the prototype — required `carrierId`, `paidAt`, structured location, stored activity, persisted reference dismissals, ids instead of free-text links — it says so and the point is in TO CONFIRM.

## Collections at a glance

| Collection | One document per | Written by | Read by |
|---|---|---|---|
| `tickets` | ticket / citation | Add / Edit form, status pill, monitored-date edit, missing-reference "Add", violation sync, driver application | List, tabs, KPIs, detail, Monitoring, profile insights, driver profile, Messages dashboards, roadside citation search |
| `ticket_references` | regulator reference that should have a ticket | regulator feed sync, violation log, Dismiss | Missing-references banner and table |
| `record_reviews` | reviewed record (`subjectKind = "ticket"` here) | Review tab: verify, note, resolve, reopen | Review tab, Activity tab |
| `ticket_activity` | event on a ticket | every ticket write (server side) | Activity tab |

## Relationships

```
carriers (Account) 1 ──< tickets            (tickets.carrierId)
drivers  (Account) 1 ──< tickets            (tickets.driverId; driverName denormalised)
assets   (Account) 1 ──< tickets            (vehicle.assetId, vehicle2.assetId — snapshots kept on the ticket)
tickets            1 ──1 record_reviews     (subjectKind "ticket", subjectId)
tickets            1 ──< ticket_activity    (ticketId)
ticket_references  * ──1 tickets            (matchedTicketId; null = missing)
tickets            * ──1 accidents          (accidentId)          ┐ outside this section
tickets            * ──1 roadside inspections (roadsideInspectionId) │
record_reviews     1 ──1 compliance Warning Letter (warningLetterId) │
record_reviews     1 ──1 Messages conversation (delivery.conversationId) ┘
```

Rules the relationships imply:
- **Citation #** unique per carrier; creating a ticket whose normalised citation / ticket number matches a reference sets that reference's `matchedTicketId`, so it leaves the missing list.
- **Primary violation** (`primary.*`) is written from `violations[0]` on every save.
- **Flags** (`flags.ticketFile / receiptFile / noticeFile`) are derived from `documents` on every save.
- **paidAt** is set when status becomes Paid and cleared when it leaves Paid.
- **Monitoring feed** (not stored): tickets with status Due / In Court and `dueMonitoring.enabled` / `finalMonitoring.enabled` → alerts "Ticket due date" / "Final date", subject = driver.
- **Deleting** is a soft delete (`deletedAt`); its review and activity stay.

## `tickets`

One document per ticket. Charges, vehicles, identifiers, court / eTicket details, monitored dates and documents are embedded because they are always read and written with the ticket. The list, tabs, KPIs, detail page, form, Monitoring feed, profile insights and the driver profile all read this collection.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "tkt-<ObjectId>" (legacy seed ids "1"…"14" and "acct-001-tkt-NNN" migrate as-is). |
| `carrierId` | string | yes | `—` | → `carriers._id` (Account). Required — the prototype drops it for form / banner / violation-created tickets. |
| `offenseNumber` | string | yes | `—` | The ticket citation # people read. Unique per carrier (partial index, deletedAt null). |
| `ticketKind` | string | yes | `"Paper"` |  One of: `Paper`, `Electronic`. |
| `date` | date | yes | `—` | Issue date, YYYY-MM-DD. |
| `time` | string | no | `null` | HH:MM; null = unknown (the prototype stores "00:00"). |
| `driverId` | string | no | `null` | → `drivers._id` (Account). |
| `driverName` | string | yes | `—` | Denormalised at write time. |
| `vehicle.assetId` | string | no | `null` | → `assets._id` (Account) — the power unit. |
| `vehicle.unitNumber` | string | no | `""` | Snapshot at the time of the ticket. |
| `vehicle.plateNumber` | string | no | `""` |  |
| `vehicle.plateJurisdiction` | string | no | `""` | State / province code. |
| `vehicle.vin` | string | no | `""` |  |
| `vehicle.label` | string | no | `""` | "Kenworth T800 2022". |
| `vehicle.kind` | string | no | `""` | "Truck · Power Unit", "Trailer · Dry Van Trailer". |
| `vehicle2.assetId` | string | no | `null` | → `assets._id` (Account) — the trailer (optional). |
| `vehicle2.unitNumber` | string | no | `""` | Snapshot at the time of the ticket. |
| `vehicle2.plateNumber` | string | no | `""` |  |
| `vehicle2.plateJurisdiction` | string | no | `""` | State / province code. |
| `vehicle2.vin` | string | no | `""` |  |
| `vehicle2.label` | string | no | `""` | "Kenworth T800 2022". |
| `vehicle2.kind` | string | no | `""` | "Truck · Power Unit", "Trailer · Dry Van Trailer". |
| `location.street` | string | no | `""` | Street / highway / mile marker. |
| `location.city` | string | no | `""` |  |
| `location.state` | string | no | `""` | State / province code (ON, DE). |
| `location.zip` | string | no | `""` |  |
| `location.country` | string | yes | `"USA"` | Also picks the code list (US SMS vs Canadian CVOR / NSC). One of: `USA`, `Canada`. |
| `description` | string | no | `""` | Free text (kept separate from the street — the prototype mixes them). |
| `violations` | object[] | yes | `—` | ≥ 1 charge: `{ label, type?, subtype?, category?, group?, code?, isOos?, source: "preset"\|"sms", dataId? }`. [0] is Primary. |
| `primary.type` | string | yes | `—` | Mirror of violations[0] — the narrow bucket used by badges and filters. One of: `Speeding`, `Overweight`, `Logbook violation`, `Equipment defect`, `Insurance lapse`, `Red Light`, `Parking`. |
| `primary.subtype` | string | no | `""` | Full master-chart text. |
| `primary.category` | string | no | `""` | BASIC family ("Unsafe Driving"). |
| `primary.group` | string | no | `""` | Violation group — drives the sub-category cards. |
| `primary.code` | string | no | `""` | SMS / CVOR / NSC code. |
| `isOos` | boolean | yes | `false` | Any charge qualifies for out-of-service. |
| `outOfService` | boolean | no | `null` | Answer to "Out of Service?" (null = unanswered). |
| `commercialVehicle` | boolean | no | `null` | Answer to "Were you in a commercial vehicle?". |
| `penalties` | string[] | no | `[]` |  Items: `Fine`, `Suspension`, `Revocation`, `Community Service`, `Other`. |
| `demeritPoints` | int | no | `null` | ≥ 0. |
| `fineAmount` | number | yes | `0` | ≥ 0, 2 decimals. |
| `legalExpense` | number | no | `0` | Lawyer, paralegal and court costs on top of the fine. |
| `currency` | string | yes | `"USD"` | Money is never summed across currencies. One of: `USD`, `CAD`. |
| `status` | string | yes | `"Due"` |  One of: `Due`, `In Court`, `Paid`, `Closed`. |
| `paidAt` | date | no | `null` | Set when status becomes Paid (new — "Paid This Month" uses it). |
| `dueDate` | date | no | `null` | Pay or answer by. YYYY-MM-DD. |
| `finalDate` | date | no | `null` | Court date / last deadline. ≥ date. |
| `dueMonitoring.enabled` | boolean | yes | `true` | Reminders for the due date on / off. |
| `dueMonitoring.basis` | string | yes | `"expiry"` | "expiry" = the date itself; "custom" = customDate. One of: `expiry`, `custom`. |
| `dueMonitoring.customDate` | date | no | `null` | YYYY-MM-DD when basis = custom. |
| `dueMonitoring.reminders` | int[] | yes | `[30,15,7,0]` | Subset of 90, 60, 45, 30, 15, 7, 0 (0 = on the date). |
| `dueMonitoring.channels.email` | boolean | yes | `true` |  |
| `dueMonitoring.channels.inApp` | boolean | yes | `true` |  |
| `dueMonitoring.assigneeUserId` | string | no | `null` | → `users._id`; who acts on the reminder. |
| `finalMonitoring.enabled` | boolean | yes | `true` | Reminders for the final date on / off. |
| `finalMonitoring.basis` | string | yes | `"expiry"` | "expiry" = the date itself; "custom" = customDate. One of: `expiry`, `custom`. |
| `finalMonitoring.customDate` | date | no | `null` | YYYY-MM-DD when basis = custom. |
| `finalMonitoring.reminders` | int[] | yes | `[30,15,7,0]` | Subset of 90, 60, 45, 30, 15, 7, 0 (0 = on the date). |
| `finalMonitoring.channels.email` | boolean | yes | `true` |  |
| `finalMonitoring.channels.inApp` | boolean | yes | `true` |  |
| `finalMonitoring.assigneeUserId` | string | no | `null` | → `users._id`; who acts on the reminder. |
| `details.officerName` | string | no | `""` | Paper. |
| `details.officerBadge` | string | no | `""` | Paper. |
| `details.courtLocation` | string | no | `""` | Paper. |
| `details.courtDate` | date | no | `null` | Paper. |
| `details.portalUrl` | string | no | `""` | Electronic. |
| `details.qrReference` | string | no | `""` | Electronic. |
| `details.issuingDevice` | string | no | `""` | Electronic. |
| `identifiers` | object | no | `{}` | Regulatory and admin numbers: ticketNumber, citationNumber, violationTicketNumber, offenceNumber, offenceNoticeNumber, contraventionNumber, microfilmNumber, docketNumber, courtCaseNumber, courtLocationCode, iconCourtCode, violationCode, statuteSection, driverLicenceNumber, plateNumber, vinNumber, inspectionReportNumber, officerBadgeNumber, usdotNumber, mcNumber, cvorNumber, nscNumber, carrierNumber, finePenaltyNumber, paymentReferenceNumber, receiptNumber. |
| `documents` | object[] | no | `[]` | `{ docTypeId, docNumber, issueDate, files: [{ fileId, name, size, contentType }] }` — docTypeId one of viol_ticket, viol_eticket, viol_summons, viol_officer_report, viol_fine_receipt, viol_court_disposition. Files live in object storage. |
| `flags.ticketFile` | boolean | yes | `false` | Derived from documents on write (drives the list icons). |
| `flags.receiptFile` | boolean | yes | `false` | True when a Fine Payment Receipt document exists. |
| `flags.noticeFile` | boolean | yes | `false` |  |
| `assignedToThirdParty` | boolean | no | `false` | Handed to a lawyer / paralegal. |
| `assigneeName` | string | no | `""` |  |
| `accidentId` | string | no | `null` | → accidents (by id, not by text). |
| `roadsideInspectionId` | string | no | `null` | → roadside inspections. |
| `source` | string | yes | `"manual"` | How the ticket came in. One of: `manual`, `reference`, `violation`, `application`, `seed`. |
| `sourceRefId` | string | no | `null` | → `ticket_references._id` or the violation / application it came from. |
| `createdByUserId` | string | no | `null` | → `users._id`. |
| `deletedAt` | date | no | `null` | Soft delete. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, offenseNumber: 1 }` | unique, partial (deletedAt null) | One citation # per carrier; search. |
| `{ carrierId: 1, status: 1, date: -1 }` | — | KPIs, status filter, default order. |
| `{ carrierId: 1, "primary.category": 1, "primary.type": 1 }` | — | Category tabs and type filter. |
| `{ carrierId: 1, driverId: 1 }` | sparse | Driver profile Tickets tab; Messages dashboards. |
| `{ carrierId: 1, "vehicle.assetId": 1 }` | sparse | Asset views. |
| `{ carrierId: 1, dueDate: 1 }, { carrierId: 1, finalDate: 1 }` | partial (status in Due, In Court) | Monitoring feed. |
| `{ "identifiers.ticketNumber": 1 }, { "identifiers.citationNumber": 1 }` | sparse | Reference reconciliation. |
| `{ offenseNumber: "text", driverName: "text", "location.city": "text" }` | text | List search. |

Schema: [collections/tickets.json](collections/tickets.json) · Samples: [sample-data/tickets.json](sample-data/tickets.json)

## `ticket_references`

Every reference that should have a ticket: the carrier's citation-issued violations and the regulator feeds (SMS, contraventions, CVOR / NSC convictions). "Missing" = no ticket matches it. Replaces the prototype's in-memory dismissals and synced batches.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "mt-viol-<id>" / "mt-ext-<externalId>". |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `sourceKind` | string | yes | `—` |  One of: `violation`, `external-feed`. |
| `source` | string | yes | `—` |  One of: `VIOL-LOG`, `SMS`, `CONTRAV`, `CVOR-CONV`, `NSC-AB-CONV`, `NSC-NS-CONV`, `NSC-PEI-CONV`. |
| `date` | date | yes | `—` | YYYY-MM-DD. |
| `time` | string | no | `null` |  |
| `driverName` | string | yes | `—` |  |
| `driverLicense` | string | no | `""` |  |
| `city` | string | no | `""` |  |
| `state` | string | no | `""` |  |
| `country` | string | no | `"USA"` |  One of: `USA`, `CA`. |
| `ticketNumber` | string | no | `""` |  |
| `citationNumber` | string | no | `""` |  |
| `convictionNumber` | string | no | `""` |  |
| `convictionDate` | date | no | `null` |  |
| `violationCode` | string | yes | `—` |  |
| `violationDescription` | string | yes | `—` |  |
| `severity` | string | yes | `"Minor"` |  One of: `OOS`, `Critical`, `Serious`, `Moderate`, `Minor`. |
| `fineAmount` | number | no | `0` |  |
| `currency` | string | yes | `"USD"` |  One of: `USD`, `CAD`. |
| `normalizedRefs` | string[] | yes | `[]` | Alphanumeric lower-case reference numbers used for matching. |
| `matchedTicketId` | string | no | `null` | → `tickets._id` once on file (null = missing). |
| `dismissedAt` | date | no | `null` |  |
| `dismissedByUserId` | string | no | `null` |  |
| `syncedAt` | date | yes | `now` | When the feed delivered it. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, matchedTicketId: 1, dismissedAt: 1, date: -1 }` | — | The missing list (matchedTicketId null, not dismissed). |
| `{ carrierId: 1, normalizedRefs: 1 }` | multikey | Matching new tickets against references. |
| `{ carrierId: 1, source: 1 }` | — | Per-source verified / missing counts. |

Schema: [collections/ticket_references.json](collections/ticket_references.json) · Samples: [sample-data/ticket_references.json](sample-data/ticket_references.json)

## `record_reviews`

One review per reviewed record. Shared by tickets, accidents, HOS violations and safety events; for this section `subjectKind = "ticket"`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `subjectKind` | string | yes | `—` |  One of: `ticket`, `accident`, `hos-violation`, `safety-event`. |
| `subjectId` | string | yes | `—` | → `tickets._id` here. |
| `status` | string | yes | `"review"` | Every ticket starts in review. One of: `review`, `resolved`. |
| `verified` | boolean | yes | `false` |  |
| `verifiedByUserId` | string | no | `null` |  |
| `disposition` | string | no | `null` |  One of: `training`, `warning`, `alert`, `notice`, `terminated`, `false`. |
| `trainingName` | string | no | `null` | Course, when disposition = training. |
| `delivery.via` | string | no | `null` |  One of: `in-app`, `external`, `email`. |
| `delivery.to` | string | no | `""` | Email for external / email. |
| `delivery.conversationId` | string | no | `null` | → the Messages conversation. |
| `warningLetterId` | string | no | `null` | The Warning Letter filed on the driver's compliance record. |
| `reviewedByUserId` | string | no | `null` |  |
| `notes` | object[] | no | `[]` | `{ text, byUserId, at }`. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ subjectKind: 1, subjectId: 1 }` | unique | One review per record. |
| `{ carrierId: 1, status: 1 }` | — | Open reviews per carrier. |

Schema: [collections/record_reviews.json](collections/record_reviews.json) · Samples: [sample-data/record_reviews.json](sample-data/record_reviews.json)

## `ticket_activity`

A real audit log for each ticket (the prototype generates a fixed trail on every view). One row per event: created, updated (with the change list), status, dates, document uploaded, shared, linked, assigned, review steps.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` |  |
| `ticketId` | string | yes | `—` | → `tickets._id`. |
| `kind` | string | yes | `—` |  One of: `created`, `updated`, `status`, `uploaded`, `shared`, `linked`, `assigned`, `verified`, `note`, `resolved`, `reopened`, `deleted`. |
| `title` | string | yes | `—` | "Status — In Court", "Ticket file uploaded". |
| `detail` | string | no | `""` |  |
| `changes` | object[] | no | `[]` | `{ field, from, to }`. |
| `byUserId` | string | no | `null` |  |
| `byName` | string | yes | `—` |  |
| `role` | string | yes | `"Office"` |  One of: `Office`, `Reviewer`, `Driver`, `System`, `Citation`. |
| `at` | date | yes | `now` |  |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ ticketId: 1, at: -1 }` | — | Activity tab, newest first. |

Schema: [collections/ticket_activity.json](collections/ticket_activity.json) · Samples: [sample-data/ticket_activity.json](sample-data/ticket_activity.json)

## Sample data

Every document in [sample-data/](sample-data/) is fictional and lines up with the Account samples (carrier `acct-001` Acme Trucking Inc., drivers `DRV-001-…`, units `AST-001-…`). The tickets cover a paper ticket in court with two charges, a trailer, documents and legal expense (the walkthrough's OFF-84729); a paid eTicket logged from an SMS reference with a receipt; a Canadian (CAD) Ontario ticket that is due; and a closed ticket created from a driver application. The references cover a matched one, a missing OOS one, a Canadian conviction and a dismissed violation-log entry; the reviews cover a warning letter, assigned training and one still in review. Emails use `.example`, numbers are invented.

## TO CONFIRM

1. Required `carrierId` on every ticket (the prototype drops it for form-, banner- and violation-created tickets).
2. `paidAt` as the basis of "Paid This Month" (today: the issue date).
3. Stable ids for seeded tickets (Acme's are regenerated on every load).
4. Structured `location` + separate `description` (today the street is folded into the description).
5. Store the activity trail (`ticket_activity`) instead of generating it.
6. Persist reference dismissals and feed syncs (`ticket_references`).
7. Link accidents and roadside inspections by id instead of free text.
8. Soft delete for every ticket (today only edited copies can be removed).
