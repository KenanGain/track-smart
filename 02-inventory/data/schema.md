# 02 – Inventory · Data model (MongoDB)

What the Inventory section stores, collection by collection, with the fields the UI reads and writes, how the collections point at each other and at Account's, and the indexes the list, holder and monitoring screens need. One JSON Schema per collection is in [collections/](collections/) and 3–5 fictional sample documents per collection in [sample-data/](sample-data/). All three are generated from one definition, so they cannot drift.

Conventions: `_id` is a readable string where the app already has one (items, vendors, categories, cards) and an ObjectId otherwise. Calendar days (`issueDate`, `expiryDate`) are `YYYY-MM-DD` strings; timestamps (`createdAt`, `at`, `signedAt`) are ISO date-times. Every document belongs to exactly one `carrierId` (built-in categories excepted) and every query starts with it. Clearing a field is `$unset` or `null`, never `undefined`.

> **ASSUMPTION:** the prototype has no database; this model is derived from the TypeScript types it uses today (`InventoryItem`, `Vendor`, `VendorCategory`, `InventoryEvent`, `InventoryCollection`, the compliance `DocVersion` a receipt is filed as) and from the forms in [../docs/page-overview.md](../docs/page-overview.md). Where the model improves on the prototype (carrier field on items, derived status, the company-issued flag, receipts as their own documents) it says so and the point is in TO CONFIRM.

## Collections at a glance

| Collection | One document per | Written by | Read by |
|---|---|---|---|
| `inventory_items` | item of company property | Add / Edit item; Assign dialog; Manage inventory; hand-back confirmation; nightly status job | List, item page, Drivers / Assets tabs, holder pages, vendor profile, Compliance Monitoring, profile insights |
| `inventory_categories` | kind of item | Item Category modal (custom ones only) | category rail, item form, vendor form, item icon |
| `vendors` | supplier | Add Vendor, Edit Vendor dialog, Delete | Vendors tab and menu, item form, vendor profile, Maintenance |
| `inventory_events` | thing that happened to an item | every inventory write (server side) | item Activity, holder Activity |
| `inventory_collections` | collect or hand-back card | Manage inventory (Save & send); driver confirm / sign | Messages (office + driver), Driver Mobile App "Collect from the office" |
| `signed_receipts` | signed form | driver signing on a collection card | Compliances & Documents (Form view / PDF), DQ file, driver profile |

## Relationships

```
carriers (Account) 1 ──< inventory_items          (inventory_items.carrierId)
carriers           1 ──< vendors                  (vendors.carrierId)
carriers           1 ──< inventory_categories     (carrierId; null = built-in for everyone)
vendors            1 ──< inventory_items          (inventory_items.vendorId)
inventory_categories 1 ─< inventory_items / vendors (categoryId; an item falls back to its vendor's)
assets (Account)   1 ──< inventory_items          (assignedAssetId — the unit it is on)
drivers (Account)  1 ──< inventory_items          (assignedDriverId — the person answerable)
inventory_items    1 ──< inventory_events         (inventory_events.itemId)
drivers            1 ──< inventory_collections    (driverId; conversationId → Messages)
inventory_collections 1 ─< signed_receipts        (collectionId; forms[].receiptId points back)
signed_receipts    * ──> compliance record        (complianceRecordId "onbform:<id>" / "consent:<id>" on the driver)
users (Account)    1 ──< events / collections     (byUserId, issuedByUserId)
```

Rules the relationships imply:
- **An item is on at most one unit and one driver.** `assignedAssetId` only when `handling` contains `asset-removable`; `assignedDriverId` only when it contains `driver-returnable`. Manage inventory refuses an item that already has a holder of that kind (409); the List's Assign dialog moves it.
- **Unit leaves the fleet** (asset deactivated or deleted in Account): clear `assignedAssetId` on its items and log "Unassigned". **Driver leaves**: keep `assignedDriverId` until the hand-back is confirmed — the open hand-back card is what gets the kit back (TO CONFIRM).
- **Deleting a vendor** is a soft delete; refuse it while items or open work orders reference it (TO CONFIRM — the prototype allows it).
- **Deleting a category** is refused while any item or vendor resolves to it.
- **Status** is recomputed from `expiryDate` on every write and by a nightly job; KPIs, chips, holder counts and the Monitoring feed read the same value.
- **Monitoring feed** (not stored): items with `monitoring.enabled` → alert id `inventory:<itemId>`, subject = assigned driver, else unit, else carrier.
- **Confirming a hand-back** clears `assignedDriverId` on the ticked lines; confirming a collection changes no assignment (it was set when the card was sent).

## `inventory_items`

Every fuel card, transponder, ELD, key, PPE item, device or document the carrier owns, with where it may go (handling), where it is (unit and / or driver) and its alert. The List tab, item page, holder pages, Manage inventory and the Monitoring feed all read this collection.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | Item id, e.g. "inv-001-001" (seed) or "inv-<ObjectId>" (new). |
| `carrierId` | string | yes | `—` | → `carriers._id` (Account). Every query starts with it. (The prototype has no carrier field on the item; it is implied by the seed bucket.) |
| `vendorId` | string | yes | `—` | → `vendors._id`; must belong to the same carrier. |
| `categoryId` | string | no | `null` | → `inventory_categories._id`. Empty = falls back to the vendor's category. |
| `name` | string | no | `null` | Record name. Empty = shown as "<Vendor> — <Category>". |
| `handling` | string[] | yes | `["asset-removable"]` | Where the item MAY go. At least one value. Items: `driver-returnable`, `asset-removable`. |
| `serial` | string | yes | `—` | The number printed on it ("FC-415483"). Labelled "Number" in the UI. Unique per carrier (TO CONFIRM). |
| `pin` | string | no | `""` | PIN / access code. Treat as a secret: returned only to full-access roles (TO CONFIRM). |
| `issueDate` | date | yes | `—` | YYYY-MM-DD. |
| `expiryDate` | date | no | `null` | YYYY-MM-DD; null = never runs out. Must be ≥ issueDate. |
| `status` | string | yes | `derived` | Derived from expiryDate on every write and nightly: < 0 days Expired, ≤ 30 days Expiring Soon, else Active (TO CONFIRM — the prototype lets the user pick it). One of: `Active`, `Expiring Soon`, `Expired`. |
| `monitoring.enabled` | boolean | yes | `false` | Alert on / off. |
| `monitoring.basis` | string | yes | `"expiry"` | Which date the alert counts back from. One of: `issue`, `expiry`, `custom`. |
| `monitoring.customDate` | date | no | `null` | YYYY-MM-DD, when basis = custom. |
| `monitoring.recurrence` | string | yes | `"annually"` | Renewal cycle (display only today). One of: `none`, `monthly`, `quarterly`, `semiannually`, `annually`, `biennially`, `triennially`, `fiveyearly`. |
| `monitoring.reminders` | int[] | yes | `[30]` | Subset of 90, 60, 45, 30, 15, 7, 0 (0 = on the date). |
| `monitoring.channels.email` | boolean | yes | `true` |  |
| `monitoring.channels.inApp` | boolean | yes | `true` |  |
| `monitoring.assigneeUserId` | string | no | `null` | → `users._id`; who acts on the alert (not settable in the UI yet). |
| `assignedAssetId` | string | no | `null` | The UNIT it is on → `assets._id`. Only when handling includes asset-removable. |
| `assignedAssetKind` | string | no | `null` | Copied from the asset on assignment. One of: `cmv`, `non-cmv`. |
| `assignedDriverId` | string | no | `null` | The PERSON answerable for it → `drivers._id`. Only when handling includes driver-returnable. |
| `assignedAt` | date | no | `null` | When the current assignment was made. |
| `contactName` | string | no | `""` | Vendor contact copied at creation (kept for the item page). |
| `contactInfo` | string | no | `""` | Vendor email / phone copied at creation. |
| `notes` | string | no | `""` | Free text. |
| `deletedAt` | date | no | `null` | Soft delete (no delete exists today — TO CONFIRM). |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, serial: 1 }` | unique, partial (deletedAt null) | One number per carrier; search by number. |
| `{ carrierId: 1, categoryId: 1, status: 1 }` | — | Category rail counts, status chips and group bands. |
| `{ carrierId: 1, assignedDriverId: 1 }` | sparse | Drivers tab, driver holder page, assignable list. |
| `{ carrierId: 1, assignedAssetId: 1 }` | sparse | Assets tab, asset holder page. |
| `{ carrierId: 1, vendorId: 1 }` | — | Vendor profile Inventory tab; delete-vendor guard. |
| `{ carrierId: 1, "monitoring.enabled": 1, expiryDate: 1 }` | — | Monitoring feed and the nightly status job. |
| `{ name: "text", serial: "text", pin: "text" }` | text | The List search box. |

Schema: [collections/inventory_items.json](collections/inventory_items.json) · Samples: [sample-data/inventory_items.json](sample-data/inventory_items.json)

## `inventory_categories`

The 12 built-in categories plus any the carrier adds in the "Item Category" modal. Drives the category rail, the item form dropdown, the vendor category and the item icon.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "cat-fuel-card" for built-ins; "cat-<ObjectId>" for custom. |
| `carrierId` | string | no | `null` | null = built-in (shared by every carrier); set = this carrier's own. |
| `name` | string | yes | `—` | Unique per carrier, case-insensitive ("Category name is required.", "A category named … already exists."). |
| `nameLower` | string | yes | `derived` | Lower-cased name, written by the server; backs the unique index. |
| `description` | string | no | `""` |  |
| `builtIn` | boolean | yes | `false` | Built-ins cannot be renamed or deleted (TO CONFIRM — the prototype allows both in memory). |
| `icon` | string | no | `"Layers"` | lucide icon name ("Fuel", "KeyRound"). |
| `palette` | string | no | `"slate"` | Tailwind hue for the tile ("amber"). |
| `sortOrder` | int | no | `0` |  |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, nameLower: 1 }` | unique (store nameLower on write) | Case-insensitive duplicate check. |

Schema: [collections/inventory_categories.json](collections/inventory_categories.json) · Samples: [sample-data/inventory_categories.json](sample-data/inventory_categories.json)

## `vendors`

Shared by Inventory (an item is filed against a vendor) and Maintenance (work orders and bills). The prototype also keeps one "Company Issued" placeholder vendor per accessory; in the model these are a flag, not rows (TO CONFIRM).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "v-001" style id. |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `name` | string | yes | `—` | Vendor name ("Comdata"). Required on Add Vendor. |
| `companyName` | string | no | `""` | Legal company ("Comdata Inc."). |
| `categoryId` | string | yes | `"cat-other"` | → `inventory_categories._id`. Add Vendor files new vendors under "Others". |
| `status` | string | yes | `"Active"` | Not editable in the UI today (TO CONFIRM). One of: `Active`, `Inactive`. |
| `contactName` | string | no | `""` |  |
| `email` | string | no | `""` | Validated as an email when present. |
| `phone` | string | no | `""` |  |
| `address.country` | string | no | `"United States"` | Stored as the full name (the edit dialog writes "USA" today). One of: `United States`, `Canada`. |
| `address.street` | string | no | `""` |  |
| `address.apt` | string | no | `""` | Apartment, suite, etc. |
| `address.city` | string | no | `""` |  |
| `address.state` | string | no | `""` | US state / DC or Canadian province code. |
| `address.zip` | string | no | `""` | ZIP or postal code. |
| `companyIssued` | boolean | yes | `false` | true = not a supplier (company-issued accessories). Hidden from vendor lists and pickers. |
| `deletedAt` | date | no | `null` | Soft delete; items and orders keep their vendorId. |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, status: 1, name: 1 }` | — | Vendors list, KPI tiles, sort by name. |
| `{ carrierId: 1, "address.state": 1 }` | — | Group by Jurisdiction. |
| `{ name: "text", companyName: "text", email: "text", contactName: "text" }` | text | Vendor search. |

Schema: [collections/vendors.json](collections/vendors.json) · Samples: [sample-data/vendors.json](sample-data/vendors.json)

## `inventory_events`

One row per thing that happened to an item: added, updated (with the change list), assigned, unassigned, asked to collect / hand in, receipt requested / signed, collected / not collected, handed back. "Added", "Assigned" and "Expired" are also derived from the item on read and never stored twice.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `itemId` | string | yes | `—` | → `inventory_items._id`. |
| `kind` | string | yes | `—` | Activity vocabulary shared with the rest of the app. One of: `created`, `updated`, `assigned`, `message`, `requested`, `signed`, `verified`, `note`. |
| `title` | string | no | `null` | Overrides the kind's label ("Assigned to driver", "Receipt signed"). |
| `detail` | string | no | `""` | "Status: Active → Expiring Soon", "Taken back from Jason Cooper". |
| `changes` | object[] | no | `[]` | For updates: `{ field, from, to }` rows. |
| `byUserId` | string | no | `null` | → `users._id` (null for System). |
| `byName` | string | yes | `—` | Display name at the time ("Kenan Gain"). |
| `role` | string | yes | `"Office"` | Badge on the timeline. One of: `Office`, `Driver`, `System`. |
| `collectionId` | string | no | `null` | → `inventory_collections._id` when the event came from a card. |
| `at` | date | yes | `now` | ISO timestamp. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ itemId: 1, at: -1 }` | — | Item Activity tab, newest first. |
| `{ carrierId: 1, at: -1 }` | — | Holder Activity tabs (filtered by the holder's item ids) and audits. |

Schema: [collections/inventory_events.json](collections/inventory_events.json) · Samples: [sample-data/inventory_events.json](sample-data/inventory_events.json)

## `inventory_collections`

What Manage inventory sends: one card per driver and direction, posted into the driver's conversation (Messages) and confirmed by the driver ticking items and, for a collection with forms, signing.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | string | yes | `—` | "col-<base36>" — the same id on every copy of the card. |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `direction` | string | yes | `"collect"` |  One of: `collect`, `return`. |
| `driverId` | string | yes | `—` | → `drivers._id`. |
| `driverName` | string | yes | `—` | At the time of sending. |
| `conversationId` | string | yes | `—` | → the driver's conversation in Messages (outside this section). |
| `holderLabel` | string | no | `""` | Unit label when the kit is for a vehicle. |
| `counterparty.kind` | string | yes | `"office"` | Where to collect from / hand to. One of: `office`, `person`. |
| `counterparty.name` | string | no | `""` | "Mike Johnson, yard office" when kind = person. |
| `dueAt` | string | no | `null` | "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm". |
| `lines` | object[] | yes | `—` | `{ itemId, name, serial, route: "assigned" }` — one per item on the card. |
| `forms` | object[] | no | `[]` | Collect only: `{ defId, title, recordId, status: pending\|signed, signedAt?, signedBy?, receiptId? }`. |
| `note` | string | no | `""` | The message text (drafted, or the office's own wording). |
| `issuedByUserId` | string | yes | `—` | → `users._id`. |
| `issuedByName` | string | yes | `—` |  |
| `status` | string | yes | `"pending"` |  One of: `pending`, `collected`. |
| `collectedItemIds` | string[] | no | `[]` | The lines the driver ticked. |
| `collectedAt` | date | no | `null` |  |
| `createdAt` | date | yes | `now` | Set by the server on insert. |
| `updatedAt` | date | yes | `now` | Set by the server on every write. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, driverId: 1, status: 1, createdAt: -1 }` | — | Driver app "Collect from the office" (pending / already collected) and the office view. |
| `{ "lines.itemId": 1 }` | — | Find open cards for an item (block a second collect). |

Schema: [collections/inventory_collections.json](collections/inventory_collections.json) · Samples: [sample-data/inventory_collections.json](sample-data/inventory_collections.json)

## `signed_receipts`

The filed copy of a receipt signed from a collection card. In the prototype this is a version on the driver's compliance record (record id `onbform:<defId>` or `consent:<defId>`, tag "Filled in system"); the model keeps it as its own immutable document that the compliance record points at.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | objectId | yes | `—` |  |
| `carrierId` | string | yes | `—` | → `carriers._id`. |
| `driverId` | string | yes | `—` | → `drivers._id`. |
| `collectionId` | string | yes | `—` | → `inventory_collections._id`. |
| `formDefId` | string | yes | `—` | Form definition ("equipment-issue"). |
| `complianceRecordId` | string | yes | `—` | "onbform:equipment-issue" / "consent:<id>" — where it is filed in Compliance. |
| `title` | string | yes | `—` | "Uniform & Equipment Issue Receipt — ACM-T0100". |
| `lines` | object[] | yes | `—` | `{ itemId, name, serial }` — only the items ticked. |
| `values` | object | yes | `—` | The filled fields (employee name, issue date, …). |
| `signatures` | object[] | yes | `—` | `{ signerId, mode: draw\|type, image?, typedName?, signedAt, ip?, userAgent? }`. |
| `signedByName` | string | yes | `—` |  |
| `signedAt` | date | yes | `now` |  |
| `pdfFileId` | string | no | `null` | Rendered PDF in file storage (the prototype keeps a 0-byte placeholder). |
| `tags` | string[] | yes | `["Filled in system"]` |  |
| `createdAt` | date | yes | `now` | Immutable after insert — no updatedAt. |

**Indexes**

| Index | Options | Why |
|---|---|---|
| `{ carrierId: 1, driverId: 1, signedAt: -1 }` | — | The driver's filed forms (Compliances & Documents, DQ file). |
| `{ collectionId: 1, formDefId: 1 }` | unique | A form is signed once per card. |

Schema: [collections/signed_receipts.json](collections/signed_receipts.json) · Samples: [sample-data/signed_receipts.json](sample-data/signed_receipts.json)

## Sample data

Every document in [sample-data/](sample-data/) is fictional and lines up with the Account samples (carrier `acct-001` Acme Trucking Inc., driver `DRV-001-0001` Jason Cooper, units `AST-001-0001…`). The items cover every combination of handling and assignment (unit + driver, unit only, nobody), an expired item with no alert, an item with no expiry and yard stock; the vendors cover a US supplier, a repair shop, a Canadian vendor and a new inactive one; the events and cards follow one real hand-out from the walkthrough (two items collected and signed for, one key handed back) plus a pending card collected from a named person. Emails use `.example`, phones are 555 numbers, signature images are truncated on purpose.

## TO CONFIRM

1. Add `carrierId` to items (the prototype infers it) — assumed yes.
2. Derive `status` from `expiryDate` instead of letting the user pick it.
3. Unique `serial` per carrier.
4. Store "Company Issued" accessories against a flag (`vendors.companyIssued`) instead of 36 placeholder vendor rows per carrier.
5. Built-in categories read-only; custom categories per carrier.
6. Soft delete for items and vendors, and the guards on delete.
7. Keep receipts as their own immutable documents (`signed_receipts`) with the compliance record pointing at them, rather than only as compliance versions.
8. PIN visibility by role.
