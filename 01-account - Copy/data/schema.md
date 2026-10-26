# 01 – Account · Data model (MongoDB)

What the Account section stores, collection by collection, with the fields the UI reads and writes, how the collections point at each other, and the indexes the list and filter screens need. One JSON Schema per collection is in [collections/](collections/) and 3–5 fictional sample documents per collection in [sample-data/](sample-data/). All three are generated from one definition, so they cannot drift.

Conventions: `_id` is a readable string where the app already has one (carrier, asset, driver, office, document ids) and an ObjectId otherwise. Dates that are a calendar day (`dob`, `hiredDate`, `plate.expiryDate`) are stored as `YYYY-MM-DD` strings; timestamps (`createdAt`, `at`) as ISO date-times. Every write is multi-tenant: a document belongs to exactly one `carrierId`, and every query starts with it.

> **ASSUMPTION:** the prototype has no database; this model is derived from the TypeScript types the app uses today (`AccountRecord`, `Asset`, `Driver`, `ApplicationData`, `Location`, `AppUser`) and from the forms in page-overview.md. Items marked TO CONFIRM need a product decision.

## Collections at a glance

| Collection | One document per | Written by | Read by |
|---|---|---|---|
| `carriers` | carrier | Fleet Overview edit modals; carrier creation (Admin) | Fleet Overview, carrier switcher, every module header |
| `office_locations` | corporate office | Fleet Overview › Corporate Office Locations | Fleet Overview |
| `directors` | director / officer | Fleet Overview › Directors & Officers | Fleet Overview |
| `yards` | yard / terminal | Yard Terminals tab | Yard Terminals, asset wizard (Location Name), Maintenance |
| `assets` | vehicle unit | Add / Edit Asset wizard, inline status, delete | Assets tab, asset detail, Compliance, Monitoring, Maintenance, Inventory, Tickets, Roadside |
| `drivers` | driver | Add / Edit Driver form, import, inline status, delete | Drivers tab, driver profile, DQ Files, Hiring, HOS, Tickets, Messages |
| `users` | app user | Settings ▸ Users & Roles | sign-in, carrier scope, role access |
| `menu_access_overrides` | menu | Users & Roles ▸ Roles | AccessGate (hidden / light / full) |
| `activity_log` | change | every Account write (server side) | Activity tabs |
| `documents` | uploaded file | asset wizard, driver form (via Compliance) | Compliances tabs, share dialogs |

## Relationships

```
carriers 1 ──< office_locations      (office_locations.carrierId)
carriers 1 ──< directors             (directors.carrierId; directors.officeLocationId → office_locations)
carriers 1 ──< yards                 (yards.carrierId)
carriers 1 ──< assets                (assets.carrierId; assets.yardId → yards; yards.assignedAssetIds mirrors it)
carriers 1 ──< drivers               (drivers.carrierId)
assets   * ──> drivers               (assets.driverAssignments[].driverId, max 2 open rows per unit)
assets/drivers/carriers 1 ──< documents   (documents.subjectType + subjectId)
assets/drivers/… 1 ──< activity_log       (activity_log.subjectType + subjectId)
users    * ──> carriers              (users.accountId, users.managedAccountIds[], users.carrierRoles keys)
users    1 ──> drivers               (users.driverId, role "driver" only)
menu_access_overrides                keyed by menu; "account" governs this section
```

Rules the relationships imply:
- Deleting a carrier is not offered in Account; if it ever is, it must cascade to all six child collections or be refused while children exist.
- Deleting an asset must clear it from `yards.assignedAssetIds`; deleting a driver must close its rows in `assets.driverAssignments` (set `endDate`). Both are refused with 409 while the unit is on an open work order / hand-over (TO CONFIRM).
- `fleetCounts` on the carrier is what was *filed*; the live numbers on the Fleet Overview tiles come from `count(assets where operationalStatus != Deactivated)` and `count(drivers where status != Terminated and deletedAt is null)`.
- `complianceMissing`, `dqCompletionPct`, `riskScore` and `yards.score` are **computed** and stored for fast lists; the Compliance service recomputes the first three whenever a record or document changes, and the yards service recomputes `score` on every write.

## `carriers`

One document per carrier. Everything the Fleet Overview tab shows except the office-location and director tables, which are their own collections because they have their own add / edit / remove flows.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | Carrier id, e.g. "acct-001". Referenced by every other collection as `carrierId`. |
| `legalName` | string | yes | `—` | Legal name as registered. |
| `dbaName` | string | no | `""` | Doing-business-as name. |
| `status` | string | yes | `"Active"` | Operating status of the record. One of: `Active`, `Inactive`, `Suspended`, `Pending`. |
| `country` | string | yes | `"US"` | Home country. One of: `US`, `CA`. |
| `identity.dotNumber` | string | no | `""` | USDOT number. Unique across carriers when set. |
| `identity.mcNumber` | string | no | `""` | FMCSA MC number (read from the MC Certificate record in Compliance; kept here as a cache). |
| `identity.safetyRegType` | string | no | `""` | Which Canadian safety registration the number below is. One of: ``, `CVOR`, `NSC`. |
| `identity.safetyRegNumber` | string | no | `""` | CVOR or primary NSC number. |
| `identity.nscNumbers` | string[] | no | `[]` | Extra provincial NSC numbers ("AB-99012"). |
| `identity.rinNumber` | string | no | `""` | Registered Importer Number. |
| `identity.businessType` | string | yes | `"Corporation"` |  One of: `Corporation`, `LLC`, `Sole Proprietor`, `Partnership`. |
| `identity.stateOfInc` | string | yes | `—` | State / province of incorporation (code). |
| `identity.extraProvincial` | boolean | no | `false` | Operates commercial vehicles across provincial / federal borders. |
| `authority.operationClassification` | string[] | no | `[]` |  Items: `Authorized for Hire`, `Private Carrier`, `Exempt For Hire`. |
| `authority.carrierOperation` | string[] | no | `[]` |  Items: `Interstate`, `Intrastate`, `Cross-Border`. |
| `authority.hazmatOperation` | string[] | no | `[]` |  Items: `Hazmat`, `Non-Hazmat`. |
| `authority.fmcsaAuthorityTypes` | string[] | no | `[]` |  Items: `Motor Carrier of Property`, `Motor Carrier of Household Goods`, `Broker of Property`. |
| `legalAddress.street` | string | no | `""` | Street line, as written on the record. |
| `legalAddress.city` | string | no | `""` | City. |
| `legalAddress.state` | string | no | `""` | State or province code (DE, ON). |
| `legalAddress.zip` | string | no | `""` | ZIP or postal code. |
| `legalAddress.country` | string | no | `"United States"` | "United States" or "Canada". One of: `United States`, `Canada`. |
| `legalAddress.apt` | string | no | `""` | Apartment, suite, etc. |
| `mailingAddress.streetOrPoBox` | string | yes | `—` | Street address or PO box. |
| `mailingAddress.city` | string | yes | `—` |  |
| `mailingAddress.state` | string | yes | `—` |  |
| `mailingAddress.zip` | string | yes | `—` |  |
| `mailingAddress.country` | string | yes | `"United States"` |  One of: `United States`, `Canada`. |
| `fleetCounts.powerUnits` | int | yes | `0` | As filed (MCS-150); the live count comes from `assets`. |
| `fleetCounts.drivers` | int | yes | `0` | As filed; the live count comes from `drivers`. |
| `fleetCounts.nonCmv` | int | no | `0` | Vehicles under 10,001 lbs. |
| `cargoTypes` | string[] | no | `[]` | MCS-150 cargo classifications as labels ("General Freight"). |
| `cargoFamilies` | string[] | no | `[]` | Derived from `cargoTypes` on write (canonical family tags). |
| `safetyRating` | string | no | `"Not Rated"` |  One of: `Satisfactory`, `Conditional`, `Unsatisfactory`, `Not Rated`. |
| `riskScore` | int | no | `null` | 0–100, computed nightly from compliance, inspections and violations; read-only on this API. |
| `serviceProfileId` | string | no | `null` | Service profile the carrier was created under → `service_profiles._id` (outside this section). |
| `createdByUserId` | string | no | `null` | → `users._id`. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ "identity.dotNumber": 1 }` | unique, sparse | DOT lookup and duplicate protection. |
| `{ serviceProfileId: 1 }` | — | Admins list the carriers under their service profile. |
| `{ legalName: "text", dbaName: "text" }` | text | Carrier switcher search. |

Schema: [collections/carriers.json](collections/carriers.json) · Samples: [sample-data/carriers.json](sample-data/carriers.json)

## `office_locations`

The carrier's offices (HQ, regional offices). Not yards — those are `yards`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "LOC-acct-001-1" style id. |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `label` | string | yes | `—` | Display label ("Corporate HQ - Wilmington"). |
| `address` | string | yes | `—` | Full address on one line. |
| `contact` | string | yes | `—` | Contact person or desk ("Head Office"). |
| `phone` | string | yes | `—` | E.164 or formatted phone. |
| `operatingHours.weekdays` | string | no | `""` | e.g. "08:00 - 18:00". |
| `operatingHours.saturday` | string | no | `""` |  |
| `operatingHours.sunday` | string | no | `"Closed"` |  |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1 }` | — | All offices of a carrier. |

Schema: [collections/office_locations.json](collections/office_locations.json) · Samples: [sample-data/office_locations.json](sample-data/office_locations.json)

## `directors`

People with ownership or an officer role at the carrier. Personal data.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `name` | string | yes | `—` | Full name. |
| `roleTitle` | string | no | `""` | "Director of Operations". |
| `email` | string | yes | `—` |  |
| `phone` | string | yes | `—` |  |
| `stockClass` | string | no | `""` | "Class A Common Stock". |
| `ownershipPct` | number | yes | `0` | 0–100. |
| `dateAppointed` | date | no | `null` | YYYY-MM-DD. |
| `dateResigned` | date | no | `null` | YYYY-MM-DD; null while serving. |
| `responsibility` | string | no | `""` | Primary responsibility, free text. |
| `isPrimary` | boolean | no | `false` | Shown first. |
| `officeLocationId` | string | no | `null` | → `office_locations._id` (the office they sit in). |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, isPrimary: -1, name: 1 }` | — | The table, primary first. |

Schema: [collections/directors.json](collections/directors.json) · Samples: [sample-data/directors.json](sample-data/directors.json)

## `yards`

Yards / terminals with their physical-security profile. The Yard Terminals tab.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `locationId` | string | yes | `"LOC-" + seq` | Display code "LOC-1001"; unique per carrier. |
| `name` | string | yes | `—` |  |
| `address.street` | string | no | `""` | Street line, as written on the record. |
| `address.city` | string | no | `""` | City. |
| `address.state` | string | no | `""` | State or province code (DE, ON). |
| `address.zip` | string | no | `""` | ZIP or postal code. |
| `timezone` | string | no | `""` | IANA zone ("America/New_York"). |
| `status` | string | yes | `"Active"` |  One of: `Active`, `Maintenance`, `Deactivated`. |
| `security.fenced` | boolean | yes | `false` | Fenced perimeter. |
| `security.gated` | boolean | yes | `false` | Gated entry. |
| `security.cctv` | boolean | yes | `false` | CCTV surveillance. |
| `security.guard` | boolean | yes | `false` | Security guard on site. |
| `security.restricted` | boolean | yes | `false` | Restricted areas defined. |
| `score` | int | yes | `0` | 0–100, computed on write from `security` (20 points per feature; the app shows ≥90 Excellent, ≥75 Good, ≥60 Fair, else Low). TO CONFIRM the weighting. |
| `group` | string | no | `"Yard / Terminal Locations"` | Band the row is grouped under. |
| `assignedAssetIds` | string[] | no | `[]` | → `assets._id` based here (mirror of `assets.yardId`). |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, locationId: 1 }` | unique | Display code per carrier. |
| `{ carrierId: 1, status: 1 }` | — | Status filter. |
| `{ name: "text", "address.street": "text", locationId: "text" }` | text | Search box. |

Schema: [collections/yards.json](collections/yards.json) · Samples: [sample-data/yards.json](sample-data/yards.json)

## `assets`

One document per unit. Mirrors the Add / Edit Asset wizard section by section. Monitoring reminders and compliance records live in their own collections (Compliance section) and reference `assets._id`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "acct-001-a-0100" style id. |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `unitNumber` | string | yes | `—` | Unique per carrier ("ACM-T0100"). |
| `assetCategory` | string | yes | `"CMV"` | Derived from `assetType`. One of: `CMV`, `Non-CMV`. |
| `assetType` | string | yes | `—` |  One of: `Truck`, `Trailer`, `Non-CMV Vehicle`. |
| `vehicleType` | string | no | `""` | One of the type's list (Power Unit, Dry Van, Pickup…) or the typed-in "Other" name. |
| `operationalStatus` | string | yes | `"Active"` | The inline status pill. One of: `Active`, `Maintenance`, `OutOfService`, `Drafted`, `Deactivated`. |
| `vin` | string | yes | `—` | Exactly 17 characters; unique per carrier. |
| `year` | int | no | `null` | 1900 … current year + 2. |
| `make` | string | yes | `—` |  |
| `model` | string | yes | `—` |  |
| `color` | string | no | `""` |  |
| `weights.gross` | number | no | `null` | Loaded weight. |
| `weights.grossUnit` | string | no | `"lbs"` |  One of: `lbs`, `kg`. |
| `weights.unloaded` | number | no | `null` |  |
| `weights.unloadedUnit` | string | no | `"lbs"` |  One of: `lbs`, `kg`. |
| `odometer.value` | number | no | `null` | Required when status is Active. |
| `odometer.unit` | string | no | `"mi"` |  One of: `mi`, `km`. |
| `plate.number` | string | no | `""` |  |
| `plate.jurisdiction` | string | no | `""` | State / province code. |
| `plate.type` | string | no | `"IRP"` |  One of: `IRP`, `Local`. |
| `plate.country` | string | no | `"USA"` |  One of: `USA`, `Canada`. |
| `plate.issueDate` | date | no | `null` |  |
| `plate.expiryDate` | date | no | `null` | Drives the "Plate expiry" tile and chip. |
| `plate.monitoring.enabled` | boolean | no | `true` |  |
| `plate.monitoring.basedOn` | string | no | `"expiry_date"` |  One of: `expiry_date`, `issue_date`. |
| `plate.monitoring.recurrence` | string | no | `"annually"` |  One of: `annually`, `quarterly`, `custom`. |
| `plate.monitoring.reminderDays` | int[] | no | `[90, 60, 30]` | Days before. |
| `plate.monitoring.channels` | string[] | no | `["email","in-app"]` |  Items: `email`, `in-app`, `sms`. |
| `yardId` | objectId | no | `null` | → `yards._id`; null = Unassigned. |
| `driverAssignments` | object[] | no | `[]` | Max 2 rows: `{ driverId → drivers._id, startDate, endDate? }`. |
| `annualSafety` | object | no | `null` | Last annual safety inspection: `{ performedOn, odometer, hours, vendorName, performedBy (vendor\|driver\|mechanic), driverId?, mechanicName?, labour, parts, currency, notes, remarks }`. |
| `ownership.structure` | string | yes | `"Owned"` |  One of: `Owned`, `Leased`, `Financed`, `Rented`. |
| `ownership.marketValue` | number | no | `null` |  |
| `ownership.currency` | string | no | `"USD"` |  One of: `USD`, `CAD`. |
| `ownership.ownerName` | string | no | `""` |  |
| `ownership.leasingName` | string | no | `""` | Leased: leasing company. |
| `ownership.lienHolderBusiness` | string | no | `""` | Financed: lien holder. |
| `ownership.rentalAgencyName` | string | no | `""` | Rented: agency. |
| `ownership.agreementStartDate` | date | no | `null` | Leased / Financed. |
| `ownership.agreementEndDate` | date | no | `null` |  |
| `ownership.monthlyPayment` | number | no | `null` |  |
| `billOfSale` | object | no | `null` | `{ recordName, purchasePrice, seller, street, city, zip, documentId → documents._id }` — also filed as a compliance record. |
| `insurance.liabilityPolicyNumber` | string | no | `""` | Policy number on the pink slip. |
| `insurance.pinkSlipExpiry` | date | no | `null` |  |
| `insurance.pinkSlipDocumentId` | string | no | `null` | → `documents._id`. |
| `insurance.addedDate` | date | no | `null` | Required when status is Active. |
| `insurance.removedDate` | date | no | `null` |  |
| `dateAdded` | date | yes | `today` | Date added to fleet. |
| `dateRemoved` | date | no | `null` | Required when Deactivated. |
| `address.street` | string | no | `""` | Street line, as written on the record. |
| `address.city` | string | no | `""` | City. |
| `address.state` | string | no | `""` | State or province code (DE, ON). |
| `address.zip` | string | no | `""` | ZIP or postal code. |
| `address.country` | string | no | `"United States"` | "United States" or "Canada". One of: `United States`, `Canada`. |
| `notes` | string | no | `""` | ≤ 2000 chars. |
| `complianceMissing` | int | no | `0` | Computed: required compliance records with no document. Shown as the "n missing" chip. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, unitNumber: 1 }` | unique | Unit numbers are unique per carrier. |
| `{ carrierId: 1, vin: 1 }` | unique | One record per VIN per carrier. |
| `{ carrierId: 1, operationalStatus: 1 }` | — | KPI tiles and status filter. |
| `{ carrierId: 1, assetCategory: 1 }` | — | CMV / Non-CMV sub-tabs. |
| `{ carrierId: 1, "plate.expiryDate": 1 }` | — | Expiring-plate monitoring and sort. |
| `{ carrierId: 1, "driverAssignments.driverId": 1 }` | — | Which unit a driver is on. |
| `{ unitNumber: "text", vin: "text", make: "text", model: "text", "plate.number": "text" }` | text | Search box. |

Schema: [collections/assets.json](collections/assets.json) · Samples: [sample-data/assets.json](sample-data/assets.json)

## `drivers`

One document per driver. The Add / Edit Driver form (the hiring application in page mode) writes it section by section. Personal data: `ssn` is stored encrypted with only the last four in clear; `dob` and licence numbers are personal too.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "DRV-001-0010" style id. |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `driverType` | string | yes | `—` | Picked at the top of the form; drives labels and the HOS window. One of: `us-only`, `canada-only`, `cross-border`. |
| `status` | string | yes | `"Active"` | The inline status pill. One of: `Active`, `On Leave`, `Inactive`, `Terminated`. |
| `firstName` | string | yes | `—` |  |
| `middleName` | string | no | `""` |  |
| `lastName` | string | yes | `—` |  |
| `suffix` | string | no | `""` |  |
| `name` | string | yes | `derived` | "First Last", kept for search and lists. |
| `avatarInitials` | string | no | `derived` |  |
| `email` | string | no | `""` | Unique per carrier when set. |
| `phone` | string | no | `""` |  |
| `cellPhone` | string | no | `""` |  |
| `dob` | date | no | `null` | Date of birth. |
| `ssnEncrypted` | string | no | `null` | SSN / SIN encrypted at rest (AES-256-GCM, key outside the DB). |
| `ssnLast4` | string | no | `""` | Last four digits for display ("•••-••-6129"). |
| `gender` | string | no | `""` |  |
| `citizenship` | string | no | `""` |  |
| `authorizedToWork.us` | boolean | no | `false` | Legal right to work in the United States. |
| `authorizedToWork.ca` | boolean | no | `false` | Legal right to work in Canada. |
| `position` | string | no | `""` | Position type ("Company Driver"). |
| `operatesInUS` | boolean | no | `false` | "Will this driver operate in or cross into the United States?" |
| `hiredDate` | date | yes | `—` | Start date; every tenure / DQ clock counts from it. |
| `dateAdded` | date | yes | `today` | When the record was entered (on or after `hiredDate`). The "Added to fleet" column. |
| `terminal` | string | no | `""` | Home terminal label. |
| `carrierCode` | string | no | `""` | Carrier-internal driver code. |
| `address.street` | string | no | `""` | Street line, as written on the record. |
| `address.city` | string | no | `""` | City. |
| `address.state` | string | no | `""` | State or province code (DE, ON). |
| `address.zip` | string | no | `""` | ZIP or postal code. |
| `address.country` | string | no | `"United States"` | "United States" or "Canada". One of: `United States`, `Canada`. |
| `address.unit` | string | no | `""` | Unit / apt. |
| `address.addr2` | string | no | `""` | Building, floor. |
| `resided3Years` | boolean | no | `true` | "Residence 3+ years?" |
| `previousResidences` | object[] | no | `[]` | `{ address, unit, country, city, state, zip, startDate, endDate }` when `resided3Years` is false. |
| `emergencyContacts` | object[] | no | `[]` | `{ name, relation, phone, email }`; the form captures the first. |
| `licenses` | object[] | no | `[]` | Repeatable: `{ number, country, authority, class, issueDate, expiryDate, medicalExpiry, current, commercial, endorsements[], restricted, restrictions, isPrimary, status, frontDocumentId, backDocumentId }`. `class` is one of "Class 1 / A" … "Class M". |
| `licensePrimary` | object | no | `derived` | `{ number, state, expiry }` copied from the primary licence for lists. |
| `disqualification` | object | no | `{}` | Six questions keyed `denied, drivingWhileSuspended, alcoholOffense, substanceOffense, reckless, failedDotTest` → `{ answer: "Yes"\|"No", when: {m,y}, explain, documentId }`. |
| `travel` | object | no | `{}` | `{ citizenshipCountry, workAuthUS, workAuthCA, passport{ number, country, expiry, documentId }, visa{ has, number, type, expiry, documentId, monitor, reminderDays[] }, workPermit{…}, twic{ has, number, expiry, documentId }, fast{…} }`. Each document is also filed as a compliance record. |
| `drivingExperience` | object[] | no | `[]` | `{ equipmentClass, freightTypes[], regions[], from, to, miles, ownerOperator }`. |
| `employment` | object[] | no | `[]` | `{ company, start, end, address…, telephone, position, reasonLeaving, terminated, current, mayContact, operatedCMV, subjectFMCSR, safetySensitive, documentIds[] }`. |
| `employmentGaps` | object[] | no | `[]` | `{ start, end, comments }`. |
| `education` | object[] | no | `[]` | `{ school, start, end, city, state, country, telephone, study, graduation }`. |
| `accidents` | object[] | no | `[]` | `{ date, type, state, commercialVehicle, atFault, ticketed, details }`. |
| `violations` | object[] | no | `[]` | `{ date, charge, state, commercialVehicle, penalty, fineAmount }`. |
| `military` | object | no | `null` | `{ served, country, branch, start, end, rank, dd214, dd214DocumentId }`. |
| `hos` | object | no | `null` | `{ days: { "YYYY-MM-DD": hours }, note }` — 8 days (US) or 14 (Canada / cross-border) before `hiredDate`. |
| `signature` | object | no | `null` | `{ declarationAccepted, applicantName, signedDate, signatureDocumentId, certified }`. |
| `dqCompletionPct` | int | no | `0` | Computed: DQ file completeness. The "DQ File" column. |
| `complianceMissing` | int | no | `0` | Computed: required records missing. The "n missing" chip. |
| `deletedAt` | date | no | `null` | Soft delete (TO CONFIRM) — keeps compliance history readable. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, status: 1, deletedAt: 1 }` | — | KPI tiles, status filter, hiding deleted rows. |
| `{ carrierId: 1, email: 1 }` | unique, sparse | No two drivers share an email on one carrier. |
| `{ carrierId: 1, "licensePrimary.number": 1 }` | — | Licence lookup from monitoring and roadside. |
| `{ carrierId: 1, hiredDate: -1 }` | — | Default sort / tenure. |
| `{ name: "text", email: "text", phone: "text", "licensePrimary.number": "text", carrierCode: "text" }` | text | Search box. |

Schema: [collections/drivers.json](collections/drivers.json) · Samples: [sample-data/drivers.json](sample-data/drivers.json)

## `users`

App users. Account visibility is the role's menu access (full / light / hidden) and the carriers the user can open. Owned by Settings ▸ Users & Roles; listed here because the section cannot be rendered without it.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` |  |
| `name` | string | yes | `—` |  |
| `email` | string | yes | `—` | Unique; the login. |
| `passwordHash` | string | no | `null` | argon2id; null for invited users. |
| `role` | string | yes | `—` | Role on the primary carrier. One of: `super-admin`, `admin`, `fleet-admin`, `safety-manager`, `user`, `driver`. |
| `status` | string | yes | `"Invited"` |  One of: `Active`, `Invited`, `Deactivated`. |
| `accountId` | string | no | `null` | Primary carrier → `carriers._id`. |
| `managedAccountIds` | string[] | no | `[]` | Carriers the user can open (empty for super-admin = all). |
| `carrierRoles` | object | no | `{}` | `{ carrierId: role }` — a different role per carrier. |
| `serviceProfileId` | string | no | `null` | Primary service profile (admins). |
| `serviceProfileIds` | string[] | no | `[]` |  |
| `driverId` | string | no | `null` | For role `driver`: → `drivers._id`. |
| `lastSignInAt` | date | no | `null` |  |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ email: 1 }` | unique | Login. |
| `{ accountId: 1 }` | — |  |
| `{ managedAccountIds: 1 }` | — | Carrier scope checks. |

Schema: [collections/users.json](collections/users.json) · Samples: [sample-data/users.json](sample-data/users.json)

## `menu_access_overrides`

The default menu-access table lives in code (`roles.data.ts`). This collection holds only the cells an admin changed, keyed by menu. Account's key is `account`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | Menu key ("account", "inventory", …). |
| `overrides` | object | yes | `{}` | `{ role: "full"\|"light"\|"hidden" }` for the roles that differ from the default. |
| `updatedByUserId` | string | no | `null` | → `users._id`. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes:** none beyond `_id`.

Schema: [collections/menu_access_overrides.json](collections/menu_access_overrides.json) · Samples: [sample-data/menu_access_overrides.json](sample-data/menu_access_overrides.json)

## `activity_log`

Append-only audit trail. The asset and driver Activity tabs read it; so does the review of who changed a status.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `subjectType` | string | yes | `—` |  One of: `carrier`, `office_location`, `director`, `yard`, `asset`, `driver`. |
| `subjectId` | string | yes | `—` | The document changed. |
| `action` | string | yes | `—` |  One of: `created`, `updated`, `status_changed`, `deleted`, `imported`, `shared`, `document_filed`. |
| `by.userId` | string | yes | `—` | → `users._id`. |
| `by.name` | string | yes | `—` | Snapshot of the user's name at the time. |
| `at` | date | yes | `now` |  |
| `detail` | string | no | `""` | One sentence ("Status changed Active → On Leave"). |
| `before` | object | no | `null` | Changed fields, previous values. |
| `after` | object | no | `null` | Changed fields, new values. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, subjectType: 1, subjectId: 1, at: -1 }` | — | An item's Activity tab, newest first. |
| `{ carrierId: 1, at: -1 }` | — | Carrier-wide log. |

Schema: [collections/activity_log.json](collections/activity_log.json) · Samples: [sample-data/activity_log.json](sample-data/activity_log.json)

## `documents`

Owned by the Compliance & Documents section; listed here because the asset wizard (bill of sale, pink slip) and the driver form (licence images, travel documents, DD-214, signature) create records in it and Account references them by id.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` |  |
| `carrierId` | string | yes | `—` |  |
| `subjectType` | string | yes | `—` |  One of: `asset`, `driver`, `carrier`. |
| `subjectId` | string | yes | `—` | → `assets._id` / `drivers._id` / `carriers._id`. |
| `kind` | string | yes | `—` | "bill_of_sale", "pink_slip", "license_front", "license_back", "passport", "visa", "work_permit", "twic", "fast", "dd214", "signature", … |
| `name` | string | yes | `—` | File name. |
| `mimeType` | string | yes | `—` | image/png, image/jpeg, application/pdf. |
| `size` | int | yes | `—` | Bytes (≤ 10 MB). |
| `storageKey` | string | yes | `—` | Object-store key; served through a signed URL, never public. |
| `uploadedBy` | string | yes | `—` | → `users._id`. |
| `uploadedAt` | date | yes | `now` |  |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, subjectType: 1, subjectId: 1 }` | — | Documents of one record. |

Schema: [collections/documents.json](collections/documents.json) · Samples: [sample-data/documents.json](sample-data/documents.json)

## Sample data

Every document in [sample-data/](sample-data/) is fictional: three carriers (a US corporation, a Canadian cross-border carrier, a new Texas LLC), their offices, directors, yards, five assets covering every ownership structure and status, four drivers covering the three driver types and every status, five users covering every role, and matching activity and document rows. Names, emails (`.example` / `example.com`), phones (555 numbers), licence numbers, VINs and SSN last-fours are invented. `ssnEncrypted` and `passwordHash` are shown truncated on purpose.

## TO CONFIRM

1. Yard `score` weighting (20 points per security feature is assumed).
2. Soft-delete for drivers (`deletedAt`) so compliance history survives.
3. Refusing asset / driver deletes while open work orders or hand-overs exist.
4. Whether `fleetCounts` should be editable at all once live counts exist.
5. Encryption key management for `ssnEncrypted` (KMS vs application secret).
