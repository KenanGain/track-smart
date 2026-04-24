# Carrier Profile Page — Definitive Reference

| Item                 | Value                                                   |
|----------------------|---------------------------------------------------------|
| **Page route**       | `/account/profile`                                      |
| **Sidebar label**    | `Account → Carrier Profile`                             |
| **Source file**      | `src/pages/profile/CarrierProfilePage.tsx`              |
| **Data / config**    | `src/pages/profile/carrier-profile.data.ts`             |
| **Embedded pages**   | `LocationsPage`, `AssetDirectoryPage`, `DriverProfileView`, `DriverForm` |
| **Doc version**      | 1.1                                                     |
| **Last updated**     | 2026-04-22                                              |

This document defines **everything** needed to build and maintain the Carrier
Profile page: the user-visible structure, every React component, every data
shape, every form field (with its type, required flag, and allowed values),
and the JSON schemas — empty and populated — for the backend contract.

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [Component Map](#2-component-map)
3. [Field-Type Glossary](#3-field-type-glossary)
4. [Save Flow — How Records Are Persisted](#4-save-flow--how-records-are-persisted)
5. [DOT Lookup / SAFER Sync](#5-dot-lookup--safer-sync)
6. [Section 1 — General Information](#section-1--general-information)
7. [Section 2 — Legal / Main Address](#section-2--legal--main-address)
8. [Section 3 — Mailing Address](#section-3--mailing-address)
9. [Section 4 — Fleet & Driver Overview](#section-4--fleet--driver-overview)
10. [Section 5 — Cargo Carried](#section-5--cargo-carried)
11. [Section 6 — Corporate Office Locations](#section-6--corporate-office-locations)
12. [Section 7 — Directors & Officers](#section-7--directors--officers)
13. [Consolidated Carrier Profile Payload](#11-consolidated-carrier-profile-payload)
14. [Cheat Sheet](#12-cheat-sheet)
15. [Change Log](#13-change-log)

---

## 1. Page Overview

### 1.1 Page structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb:  Account / Carrier Profile                          │
├─────────────────────────────────────────────────────────────────┤
│ Tabs:  [Fleet Overview]  Yard Terminals   Assets   Drivers      │
├─────────────────────────────────────────────────────────────────┤
│ Fleet Overview tab (this doc's scope)                           │
│                                                                 │
│ ┌─ General Information ─────────────────────────────────────┐   │
│ │  Corporate Identity grid  │  Carrier Risk Score (gauge)   │   │
│ │  Operations & Authority   │                               │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Legal / Main Address ─┐   ┌─ Mailing Address ────────────┐   │
│ └────────────────────────┘   └──────────────────────────────┘   │
│                                                                 │
│ ┌─ Fleet & Driver Overview ─┐  ┌─ Cargo Carried ────────────┐   │
│ │  (read-only, auto-synced) │  │ tag cloud + edit modal     │   │
│ └───────────────────────────┘  └────────────────────────────┘   │
│                                                                 │
│ ┌─ Corporate Office Locations (table, full width) ───────────┐  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Directors & Officers (table, full width) ─────────────────┐  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Tabs and ownership

| Tab             | ID          | Content (component)                  | Scope of this doc |
|-----------------|-------------|--------------------------------------|-------------------|
| Fleet Overview  | `fleet`     | All seven sections above             | ✅                |
| Yard Terminals  | `locations` | `<LocationsPage hideBreadcrumb />`   | ❌                |
| Assets          | `assets`    | `<AssetDirectoryPage isEmbedded />`  | ❌                |
| Drivers         | `drivers`   | Driver list + `<DriverProfileView>`  | ❌                |

### 1.3 Section list

| # | Section                      | Data source                                                   | Editable             |
|---|------------------------------|---------------------------------------------------------------|----------------------|
| 1 | General Information          | `UI_DATA.editModals.corporateIdentity.values` + `operationsAuthority.values` | Two edit buttons (pencils) |
| 2 | Legal / Main Address         | `UI_DATA.editModals.legalMainAddress.values`                  | Edit button (pencil) |
| 3 | Mailing Address              | `UI_DATA.editModals.mailingAddress.values`                    | Edit button (pencil) |
| 4 | Fleet & Driver Overview      | **Derived** from `INITIAL_ASSETS` + `MOCK_DRIVERS`            | **No** (read-only)   |
| 5 | Cargo Carried                | `UI_DATA.cargoEditor.values.selected`                         | Edit button (pencil) |
| 6 | Corporate Office Locations   | `OFFICE_LOCATIONS` (state: `officeLocations`)                 | CRUD (table + modal) |
| 7 | Directors & Officers         | `DIRECTOR_UI.directors` (state: `directorData`)               | CRUD (table + modals)|

### 1.4 Top-level data exports

Defined in `src/pages/profile/carrier-profile.data.ts`.

| Export                | Role                                                                    |
|-----------------------|-------------------------------------------------------------------------|
| `UI_DATA`             | Modal configs + values for editable cards                               |
| `DIRECTOR_UI`         | Director view/edit modal config + seed directors                        |
| `OFFICE_LOCATIONS`    | Office location seed records                                            |
| `INITIAL_VIEW_DATA`   | Breadcrumb, carrier header name/status (only `.carrierHeader.name` used)|
| `COMPLIANCE_NUMBERS`  | (separate card family, not documented here)                             |
| `DRIVER_TYPES`        | Enum for driver roles (used in Drivers tab, not here)                   |
| `CARGO_FAMILY_MAPPING`| Friendly commodity label → canonical backend family + value             |

---

## 2. Component Map

### 2.1 Page-level components

| Component                   | File                                             | Purpose                         |
|-----------------------------|--------------------------------------------------|----------------------------------|
| `CarrierProfilePage`        | `src/pages/profile/CarrierProfilePage.tsx`       | Page shell, tabs, state store    |
| `Card`                      | (inline in page)                                 | Standard card with icon + edit   |
| `Badge`                     | (inline in page)                                 | Colored status pill              |
| `DynamicIcon`               | (inline in page)                                 | String-name → lucide icon        |

### 2.2 Modals (Fleet Overview tab)

| Component                        | Triggers when                             | Config source                              |
|----------------------------------|-------------------------------------------|--------------------------------------------|
| `EditCorporateIdentityModal`     | Pencil on General Information (top-right) | `UI_DATA.editModals.corporateIdentity`     |
| `EditOperationsAuthorityModal`   | Pencil on Operations & Authority sub-block| `UI_DATA.editModals.operationsAuthority`   |
| `EditLegalMainAddressModal`      | Pencil on Legal / Main Address card       | `UI_DATA.editModals.legalMainAddress`      |
| `EditMailingAddressModal`        | Pencil on Mailing Address card            | `UI_DATA.editModals.mailingAddress`        |
| `CargoEditorModal`               | Pencil on Cargo Carried card              | `UI_DATA.cargoEditor`                      |
| `LocationEditorModal`            | "Add Location" button OR row Edit icon    | `UI_DATA.editModals.addOfficeLocation`     |
| `LocationViewModal`              | Clicking an office row                    | (direct data)                              |
| `DirectorEditModal`              | "Add Director" OR Edit from View modal    | `DIRECTOR_UI.editModal`                    |
| `DirectorViewModal`              | Clicking "View More" on director row      | `DIRECTOR_UI.viewModal`                    |

> Fleet & Driver Overview has **no** edit modal despite `UI_DATA.editModals.fleetDriverOverview` existing — the card is read-only and derived from other entities.

### 2.3 Page state (what `CarrierProfilePage` owns)

| State                      | Type                       | Purpose                                   |
|----------------------------|----------------------------|-------------------------------------------|
| `activeTab`                | `"fleet" \| "locations" \| "assets" \| "drivers"` | Active tab |
| `formConfig`               | `typeof UI_DATA`           | Editable config (modal values)            |
| `activeModal`              | `string \| null`           | Which modal is open (by modal id)         |
| `officeLocations`          | `OfficeLocation[]`         | Office records                            |
| `editingOffice`            | `OfficeLocation \| null`   | Row being edited                          |
| `isOfficeModalOpen`        | `boolean`                  | Location editor open flag                 |
| `viewingOffice`            | `OfficeLocation \| null`   | Row being viewed                          |
| `isOfficeViewModalOpen`    | `boolean`                  | Location viewer open flag                 |
| `directorData`             | `Record<string, Director>` | Directors keyed by name                   |
| `selectedDirectorName`     | `string \| null`           | Director in focus                         |
| `directorModalMode`        | `"add" \| "edit" \| "view" \| null` | Director modal state             |
| `toast`                    | `{ visible, message }`     | Transient success banner                  |

---

## 3. Field-Type Glossary

All edit modals render fields through a single `FieldRenderer` that interprets
the `type` attribute in modal config.

| `type`         | Renders as                                  | Value shape                        |
|----------------|---------------------------------------------|------------------------------------|
| `text`         | `<input type="text">`                       | `string`                           |
| `email`        | `<input type="email">`                      | `string` (RFC 5322)                |
| `tel`          | `<input type="tel">`                        | `string`                           |
| `number`       | `<input type="number">`                     | `number`                           |
| `date`         | `<input type="date">`                       | `string` `YYYY-MM-DD`              |
| `textarea`     | `<textarea>`                                | `string`                           |
| `select`       | `<select>` with `options: string[]`         | `string` (one of options)          |
| `radioCards`   | Card-style radio group                      | `string`                           |
| `radioList`    | Stacked radio list                          | `string`                           |
| `dotLookup`    | Text input + "Lookup" button → SAFER pull   | `string` (7-digit DOT)             |

### Field config attributes

| Attribute     | Purpose                                                                 |
|---------------|-------------------------------------------------------------------------|
| `key`         | Property on the values object. **Must match backend API key.**          |
| `label`       | Display label.                                                          |
| `type`        | See table above.                                                        |
| `required`    | `true` ⇒ validated on submit and label shows red `*`.                   |
| `options`     | `select` / `radio*`: allowed values.                                    |
| `placeholder` | Input placeholder.                                                      |
| `helperText`  | Small grey caption under the field.                                     |
| `info`        | `true` ⇒ label shows an info icon with helper text on hover.            |
| `rows`        | `textarea` only — number of rows.                                       |

---

## 4. Save Flow — How Records Are Persisted

Every editable section on this page goes through the same save contract.
**There is no page-level "Save" button** — saves happen **per modal**, one
section at a time. The lifecycle below applies to every edit modal on the
Fleet Overview tab.

### 4.1 Where the Save button lives

Every edit modal has a sticky footer with exactly two buttons:

```
┌─────────────────────────────────────────────┐
│  (modal body — the form fields)             │
│                                             │
├─────────────────────────────────────────────┤
│                      [ Cancel ]  [ 💾 Save ]│   ← config.saveLabel
└─────────────────────────────────────────────┘
```

The label on the right-hand button comes from the modal config's
`saveLabel` string. The table below is the exhaustive list:

| Section                       | Modal component                   | Button label       | Config path                                  |
|-------------------------------|-----------------------------------|--------------------|----------------------------------------------|
| Corporate Identity            | `GenericEditModal` (id `editCorporateIdentity`)    | **Save Changes** | `UI_DATA.editModals.corporateIdentity.saveLabel` |
| Operations & Authority        | `GenericEditModal` (id `editOperationsAuthority`)  | **Save Changes** | `UI_DATA.editModals.operationsAuthority.saveLabel`|
| Legal / Main Address          | `GenericEditModal` (id `editLegalMainAddress`)     | **Save Changes** | `UI_DATA.editModals.legalMainAddress.saveLabel`   |
| Mailing Address               | `GenericEditModal` (id `editMailingAddress`)       | **Save Changes** | `UI_DATA.editModals.mailingAddress.saveLabel`     |
| Fleet & Driver Overview       | *(no save — derived)*             | —                  | —                                            |
| Cargo Carried                 | `CargoEditorModal`                | **Save Changes**   | `UI_DATA.cargoEditor` (implicit)             |
| Corporate Office Locations (Add)   | `GenericEditModal` (id `addOfficeLocation`)   | **Add Location** | `UI_DATA.editModals.addOfficeLocation.saveLabel` |
| Corporate Office Locations (Edit)  | `LocationEditorModal`              | **Save Changes**  | Inside component                            |
| Directors (Add / Edit)        | `DirectorEditModal`               | **Save Changes**   | `DIRECTOR_UI.editModal.saveLabel`            |

> 💡 All buttons use the same `Save` icon (lucide `Save`) and Tailwind
> `bg-blue-600 hover:bg-blue-700` style. Cancel is a secondary ghost button.

### 4.2 Click → persist lifecycle

```
User clicks the Save button
        │
        ▼
 1. Client-side validation
    — for each field with `required: true` in config,
      check that formData[key] is non-empty.
    — on failure: set errors, highlight the fields
      in red with "This field is required.", STOP.
        │ pass
        ▼
 2. Modal calls onSave(config.id, formData)
        │
        ▼
 3. Parent router — CarrierProfilePage.handleModalSave(id, values)
        │
        ├── id === 'cargoEditor'
        │      ↳ setFormConfig.cargoEditor.values = values
        │      ↳ toast: "Cargo Types updated successfully"
        │
        ├── id === 'addOfficeLocation'
        │      ↳ generate id `LOC-XXXX`
        │      ↳ append default operating hours
        │      ↳ setOfficeLocations([...prev, newOffice])
        │      ↳ toast: "Office Location added successfully"
        │
        └── any other editModal id
               ↳ find matching editModals.<key>
               ↳ setFormConfig.editModals[key].values = values
               ↳ toast: "Changes saved successfully"
        │
        ▼
 4. Modal closes (onClose()).
 5. Green success toast shown for 3 seconds.
```

Directors use a **parallel but separate** handler — `handleDirectorSave` —
because it derives `initials` from the name and `since` from today's date.
Office location **edits** (not adds) are handled by `LocationEditorModal`
directly with its own `onSave` callback (no router).

### 4.3 What `handleModalSave` actually writes

| Modal id                     | Target in state                                             |
|------------------------------|-------------------------------------------------------------|
| `editCorporateIdentity`      | `formConfig.editModals.corporateIdentity.values`            |
| `editOperationsAuthority`    | `formConfig.editModals.operationsAuthority.values`          |
| `editLegalMainAddress`       | `formConfig.editModals.legalMainAddress.values`             |
| `editMailingAddress`         | `formConfig.editModals.mailingAddress.values`               |
| `cargoEditor`                | `formConfig.cargoEditor.values` (`{ selected: [...] }`)     |
| `addOfficeLocation`          | `officeLocations[]` (appends a new record with generated `LOC-XXXX` id + default operating hours) |
| Director add / edit          | `directorData[name]` (keyed by full name; derives `initials`, `since`) |
| Office edit (not add)        | Row is merged via `setOfficeLocations(prev => prev.map(...))` |
| Office delete                | `handleDeleteOffice(id)` — no confirm dialog currently      |

### 4.4 Backend contract (future, when wired)

Currently `handleModalSave` mutates local state only. When connected to an
API, each modal save should translate to a single `PATCH` on the relevant
sub-resource:

| Modal id                     | API call (recommended)                                      |
|------------------------------|-------------------------------------------------------------|
| `editCorporateIdentity`      | `PATCH /carriers/{id}/corporate-identity`                   |
| `editOperationsAuthority`    | `PATCH /carriers/{id}/operations-authority`                 |
| `editLegalMainAddress`       | `PATCH /carriers/{id}/legal-main-address`                   |
| `editMailingAddress`         | `PATCH /carriers/{id}/mailing-address`                      |
| `cargoEditor`                | `PUT /carriers/{id}/cargo-carried` (replace the array)      |
| `addOfficeLocation`          | `POST /carriers/{id}/office-locations`                      |
| Office edit                  | `PATCH /carriers/{id}/office-locations/{locationId}`        |
| Office delete                | `DELETE /carriers/{id}/office-locations/{locationId}`       |
| Director add                 | `POST /carriers/{id}/directors`                             |
| Director edit                | `PATCH /carriers/{id}/directors/{directorId}`               |

The modal should:

1. Disable the Save button while the request is pending.
2. On 2xx — close the modal, show the success toast.
3. On 4xx — surface server-side validation errors onto the matching fields.
4. On 5xx — show a "Couldn't save. Try again." banner inside the modal,
   keep the form open and dirty.

### 4.5 What the user sees at each step

| State                 | Button text          | Footer bg      | Toast                              |
|-----------------------|----------------------|----------------|------------------------------------|
| Idle (form dirty)     | Save Changes         | slate-50       | —                                  |
| Validation error      | Save Changes         | slate-50       | — *(inline red text under field)*  |
| Submitting (future)   | *Saving…* (disabled) | slate-50       | —                                  |
| Saved                 | —                    | —              | ✅ "Changes saved successfully"    |

---

## 5. DOT Lookup / SAFER Sync

The **DOT Number** field on the Corporate Identity modal is unique — it is
the only field of type `dotLookup`, and it carries a **"Lookup"** button
next to the input. Clicking that button pulls the carrier's record from
FMCSA SAFER and **auto-fills** four form fields for the user.

### 5.1 What it is (and isn't)

| It is ✅                                              | It is not ❌                                        |
|------------------------------------------------------|----------------------------------------------------|
| A pre-fill assistant that reduces typing             | A save action — it does **not** persist anything   |
| A validator that checks the DOT is well-formed       | A "verify carrier" legal check                     |
| A reversible action — the user can still edit values | A one-shot lock — values remain fully editable     |

**Critical:** DOT Lookup populates the form. You still have to click **Save
Changes** at the bottom of the modal for the values to be written to the
carrier record.

### 5.2 Where the Lookup button lives

```
┌─ Edit Corporate Identity ─────────────────────────────────┐
│                                                           │
│  DOT Number                                               │
│  ┌───────────────────────────┐  ┌──────────────────────┐  │
│  │ 3421765                   │  │  🌐 Lookup           │  │
│  └───────────────────────────┘  └──────────────────────┘  │
│  US Federal Motor Carrier Safety Administration (FMCSA)   │
│  USDOT #. Click Lookup to pull SAFER record.              │
│                                                           │
│  CVOR Number           NSC Number                         │
│  ...                                                      │
│                                                           │
│                              [ Cancel ]  [ 💾 Save ]      │
└───────────────────────────────────────────────────────────┘
```

The Lookup button:

- Is **disabled** when the DOT input is empty or a lookup is already in flight
- Shows a spinner and "Looking up…" text while pending
- Has the same blue primary style as the Save button

### 5.3 Exact behaviour

Implemented in `GenericEditModal.handleDotLookup(dot: string)` in
`src/pages/profile/CarrierProfilePage.tsx` (around line 149).

```
User types a DOT, clicks Lookup
        │
        ▼
 1. Sanitize: input is stripped to digits only on change.
        │
        ▼
 2. Validate format:
    if (!/^\d{4,10}$/.test(dot)) {
      state → 'error'
      msg   → "Enter a valid DOT number (4-10 digits)"
      STOP
    }
        │
        ▼
 3. state → 'loading'
    msg   → "Contacting SAFER / FMCSA public database…"
    Spinner appears in the button.
        │
        ▼
 4. API call (currently simulated — 1200 ms setTimeout)
    In production: fetch(`/api/safer/${dot}`).
        │
        ▼
 5. Merge response into formData:
    { legalName, dbaName, businessType, stateOfInc, dotNumber }
        │
        ▼
 6. state → 'success'
    msg   → "DOT 3421765 verified — carrier record pre-filled from FMCSA SAFER"
    ✅ BadgeCheck icon shown, green text.
```

### 5.4 Fields pre-filled by a successful lookup

| Field          | Where it lands              | Why                                                 |
|----------------|-----------------------------|-----------------------------------------------------|
| `dotNumber`    | DOT Number                  | Canonicalized (digits only) back into the field.    |
| `legalName`    | Legal Name                  | From SAFER registered carrier record.               |
| `dbaName`      | DBA Name                    | If present on SAFER.                                |
| `businessType` | Business Type (select)      | Mapped from SAFER entity type.                      |
| `stateOfInc`   | State of Inc. (select)      | From SAFER state of registration.                   |

`cvorNumber`, `nscNumber`, `rinNumber`, and `extraProvincial` are **not**
touched by the lookup — those are Canadian / importer fields not surfaced
by FMCSA SAFER.

### 5.5 States and visual cues

| State      | Message text                                                            | Color   | Icon         |
|------------|-------------------------------------------------------------------------|---------|--------------|
| `idle`     | *(falls back to field.helperText — the grey hint under the input)*      | slate-500 | —          |
| `loading`  | "Contacting SAFER / FMCSA public database…"                             | slate-500 | Spinner    |
| `success`  | "DOT 3421765 verified — carrier record pre-filled from FMCSA SAFER"     | emerald-600 | BadgeCheck |
| `error`    | "Enter a valid DOT number (4-10 digits)"                                | red-600  | —           |

Editing the DOT input after a lookup resets the state back to `idle` —
this prevents stale success messages from surviving a new DOT value.

### 5.6 Mock vs. real implementation

**Today (mock):** `handleDotLookup` always returns:

```json
{
  "legalName": "Acme Trucking Inc.",
  "dbaName": "Acme Logistics",
  "businessType": "Corporation",
  "stateOfInc": "Delaware"
}
```

after a 1200 ms `setTimeout`.

**Production (recommended):**

- Replace the `setTimeout` with:
  ```ts
  const res = await fetch(`/api/safer/${dot}`);
  if (!res.ok) { state = 'error'; msg = 'Carrier not found in SAFER'; return; }
  const { legalName, dbaName, businessType, stateOfInc } = await res.json();
  ```
- Backend should proxy FMCSA SAFER (https://safer.fmcsa.dot.gov/) and
  normalize the entity-type → `Corporation | LLC | Sole Proprietor | Partnership`
  mapping.
- Cache SAFER lookups server-side for 24h to avoid rate-limit issues.

### 5.7 Reminder — Save still required

After a green "✅ DOT verified" message:

1. The form is **pre-filled** but **not yet saved**.
2. The user reviews / corrects any fields.
3. The user clicks the **Save Changes** button at the bottom of the modal.
4. Only then does `handleModalSave('editCorporateIdentity', formData)` run
   and persist the values into `formConfig.editModals.corporateIdentity.values`.

If the user clicks **Cancel** instead, all lookup-injected values are
discarded.

---

# Section 1 — General Information

## 1.1 Purpose

Shows the carrier's identity and operating authority in one consolidated
card. Split into two edit-groups:

- **Corporate Identity** — DOT / CVOR / NSC / RIN numbers, legal & DBA names,
  business type, state of incorporation, extra-provincial flag.
- **Operations & Authority** — operation classification, interstate/intrastate
  scope, FMCSA authority type.

Also renders a **Carrier Risk Score** gauge (currently a hardcoded display
— `94/100 · Excellent`, not backed by any field in the config).

## 1.2 UI Components

- Rendered directly inside the `fleet` tab branch of `CarrierProfilePage.tsx`
  (not extracted into a `Card` component — it is a bespoke layout).
- Edit entry points:
  - Pencil on the top-right edge → opens **`EditCorporateIdentityModal`**
  - Pencil on the Operations & Authority sub-header → opens
    **`EditOperationsAuthorityModal`**

## 1.3 Edit Form — Corporate Identity

Config: `UI_DATA.editModals.corporateIdentity`

| Field             | Label              | Type        | Required | Options / Notes                                                                        |
|-------------------|--------------------|-------------|----------|----------------------------------------------------------------------------------------|
| `dotNumber`       | DOT Number         | `dotLookup` | ❌       | US FMCSA USDOT #. `Lookup` pulls SAFER record. 7 digits.                               |
| `cvorNumber`      | CVOR Number        | `text`      | ❌       | Ontario Commercial Vehicle Operator's Registration number. Pattern `CVOR-XXXXX`.       |
| `nscNumber`       | NSC Number         | `text`      | ❌       | Canadian National Safety Code identifier. Pattern `<Province>-XXXXX`.                  |
| `rinNumber`       | RIN                | `text`      | ❌       | Registered Importer / Registration Identification Number.                              |
| `legalName`       | Legal Name         | `text`      | ✅       | Must match corporate registration.                                                     |
| `dbaName`         | DBA Name           | `text`      | ❌       | "Doing Business As" / trade name.                                                      |
| `businessType`    | Business Type      | `select`    | ✅       | `Corporation`, `LLC`, `Sole Proprietor`, `Partnership`                                 |
| `stateOfInc`      | State of Inc.      | `select`    | ✅       | `Delaware`, `California`, `Texas`, `Florida`, `New York`                               |
| `extraProvincial` | Extra-Provincial   | `select`    | ❌       | `Yes` / `No` — operates across provincial/federal borders.                             |

Layout: `[["dotNumber","cvorNumber"], ["nscNumber","rinNumber"], ["legalName","dbaName"], ["businessType","stateOfInc"], ["extraProvincial"]]`

## 1.4 Edit Form — Operations & Authority

Config: `UI_DATA.editModals.operationsAuthority`

| Field                     | Label                            | Type         | Required | Options                                                                                      |
|---------------------------|----------------------------------|--------------|----------|----------------------------------------------------------------------------------------------|
| `operationClassification` | Operation Classification         | `select`     | ❌       | `Authorized for Hire`, `Private Carrier`, `Exempt For Hire`                                  |
| `carrierOperation`        | Carrier Operation                | `radioCards` | ❌       | `Interstate`, `Intrastate Only (Hazmat)`, `Intrastate Only (Non-Hazmat)`                     |
| `fmcsaAuthorityType`      | FMCSA Operating Authority Types  | `radioList`  | ❌       | `Motor Carrier of Property`, `Motor Carrier of Household Goods`, `Broker of Property`        |

Layout: `[["operationClassification"], ["carrierOperation"], ["fmcsaAuthorityType"]]`

## 1.5 Data Dictionary

### Entity — `CorporateIdentity`

| Attribute         | Data type | Required | Max length / Format     | Description                                                 |
|-------------------|-----------|----------|--------------------------|-------------------------------------------------------------|
| `dotNumber`       | string    | no       | 7 digits                 | USDOT number. Natural key for FMCSA reconciliation.         |
| `cvorNumber`      | string    | no       | `CVOR-\d{5}`             | Ontario CVOR.                                               |
| `nscNumber`       | string    | no       | `[A-Z]{2}-\d{5}`         | Canadian NSC.                                               |
| `rinNumber`       | string    | no       | `RIN-\d+`                | Registered Importer #.                                      |
| `legalName`       | string    | **yes**  | ≤ 120 chars              | Legal entity name.                                          |
| `dbaName`         | string    | no       | ≤ 120 chars              | Trade name.                                                 |
| `businessType`    | enum      | **yes**  | 4 options                | Corporation / LLC / Sole Proprietor / Partnership.          |
| `stateOfInc`      | enum      | **yes**  | Full state name          | State of incorporation.                                     |
| `extraProvincial` | enum      | no       | `Yes` \| `No`            | Whether crossing provincial/federal borders.                |

### Entity — `OperationsAuthority`

| Attribute                 | Data type | Required | Options                                                                                      |
|---------------------------|-----------|----------|----------------------------------------------------------------------------------------------|
| `operationClassification` | enum      | no       | `Authorized for Hire`, `Private Carrier`, `Exempt For Hire`                                  |
| `carrierOperation`        | enum      | no       | `Interstate`, `Intrastate Only (Hazmat)`, `Intrastate Only (Non-Hazmat)`                     |
| `fmcsaAuthorityType`      | enum      | no       | `Motor Carrier of Property`, `Motor Carrier of Household Goods`, `Broker of Property`        |

## 1.6 Empty JSON Schema

```json
{
  "corporateIdentity": {
    "dotNumber": "",
    "cvorNumber": "",
    "nscNumber": "",
    "rinNumber": "",
    "legalName": "",
    "dbaName": "",
    "businessType": null,
    "stateOfInc": null,
    "extraProvincial": null
  },
  "operationsAuthority": {
    "operationClassification": null,
    "carrierOperation": null,
    "fmcsaAuthorityType": null
  }
}
```

## 1.7 Populated JSON Schema

```json
{
  "corporateIdentity": {
    "dotNumber": "3421765",
    "cvorNumber": "CVOR-00123",
    "nscNumber": "AB-12345",
    "rinNumber": "RIN-0099",
    "legalName": "Acme Trucking Inc.",
    "dbaName": "Acme Logistics",
    "businessType": "Corporation",
    "stateOfInc": "Delaware",
    "extraProvincial": "Yes"
  },
  "operationsAuthority": {
    "operationClassification": "Authorized for Hire",
    "carrierOperation": "Intrastate Only (Non-Hazmat)",
    "fmcsaAuthorityType": "Motor Carrier of Property"
  }
}
```

## 1.8 Relationships

- `dotNumber` is the reconciliation key with FMCSA SAFER and with the
  `COMPLIANCE_NUMBERS.regulatory` group's "USDOT Number" row.
- `legalName` is what renders as the large page title
  (`viewData.page.carrierHeader.name`).
- `cvorNumber`, `nscNumber`, `rinNumber` are concatenated with ` / ` in the
  header chip.

---

# Section 2 — Legal / Main Address

## 2.1 Purpose

The carrier's primary physical address. Used on tax forms, safety filings,
and most legal correspondence.

## 2.2 UI Components

- **Read view:** `Card` titled "Legal / Main Address", icon `MapPin`, editable
- **Edit:** `EditLegalMainAddressModal`
- Config: `UI_DATA.editModals.legalMainAddress`

## 2.3 Edit Form

| Field     | Label                     | Type     | Required | Options / Notes                                |
|-----------|---------------------------|----------|----------|------------------------------------------------|
| `country` | Country                   | `select` | ❌       | `United States`, `Canada`                      |
| `street`  | Street Address            | `text`   | ❌       | Street line 1                                  |
| `apt`     | Apartment, suite, etc.    | `text`   | ❌       | Line 2 — optional                              |
| `city`    | City                      | `text`   | ❌       | —                                              |
| `state`   | State                     | `select` | ❌       | `DE`, `NY`, `CA`, `TX` (seed; backend should accept full list) |
| `zip`     | ZIP Code                  | `text`   | ❌       | US ZIP or CA postal code                       |

Layout: `[["country"], ["street"], ["apt"], ["city","state"], ["zip"]]`

> ⚠️ **Note:** All fields are declared `required: false` in config, but
> `country`, `street`, `city`, `state`, `zip` are effectively mandatory for
> a complete profile. Backend should flag as incomplete if blank.

## 2.4 Data Dictionary — `LegalMainAddress`

| Attribute | Data type | Required | Format                   | Description              |
|-----------|-----------|----------|--------------------------|--------------------------|
| `country` | enum      | no*      | `United States`, `Canada`| Country.                 |
| `street`  | string    | no*      | ≤ 120 chars              | Line 1.                  |
| `apt`     | string    | no       | ≤ 40 chars               | Line 2 — suite/apt/unit. |
| `city`    | string    | no*      | ≤ 80 chars               | City name.               |
| `state`   | enum      | no*      | 2-letter code            | State / province.        |
| `zip`     | string    | no*      | `\d{5}(-\d{4})?` or `[A-Z]\d[A-Z] \d[A-Z]\d` | Postal code. |

`no*` = optional in config but recommended for data completeness.

## 2.5 Empty JSON Schema

```json
{
  "legalMainAddress": {
    "country": null,
    "street": "",
    "apt": "",
    "city": "",
    "state": null,
    "zip": ""
  }
}
```

## 2.6 Populated JSON Schema

```json
{
  "legalMainAddress": {
    "country": "United States",
    "street": "1200 North Dupont Highway",
    "apt": "",
    "city": "Wilmington",
    "state": "DE",
    "zip": "19801"
  }
}
```

## 2.7 Relationships

- Feeds the carrier's public location display (future: `carrierHeader.meta[Location]`).
- Independent from `mailingAddress` — no automatic sync; UI may offer a "Copy from Legal" action.

---

# Section 3 — Mailing Address

## 3.1 Purpose

Where mail / packages are delivered. Often differs from the legal address
(PO Box, remittance center, etc.).

## 3.2 UI Components

- **Read view:** `Card` titled "Mailing Address", icon `Mail`, editable
- **Edit:** `EditMailingAddressModal`
- Config: `UI_DATA.editModals.mailingAddress`

## 3.3 Edit Form

| Field        | Label                       | Type     | Required | Options / Notes               |
|--------------|-----------------------------|----------|----------|-------------------------------|
| `streetOrPo` | Street Address or PO Box    | `text`   | ✅       | Accepts PO box or street      |
| `city`       | City                        | `text`   | ✅       | —                             |
| `state`      | State                       | `select` | ✅       | `DE`, `NY`, `CA`, `TX`        |
| `zip`        | ZIP Code                    | `text`   | ✅       | US ZIP or CA postal code      |
| `country`    | Country                     | `select` | ✅       | `United States`, `Canada`     |

Layout: `[["streetOrPo"], ["city","state"], ["zip","country"]]`

> Unlike Legal / Main Address, **every field here is required**.

## 3.4 Data Dictionary — `MailingAddress`

| Attribute    | Data type | Required | Format                  |
|--------------|-----------|----------|-------------------------|
| `streetOrPo` | string    | **yes**  | ≤ 120 chars             |
| `city`       | string    | **yes**  | ≤ 80 chars              |
| `state`      | enum      | **yes**  | 2-letter code           |
| `zip`        | string    | **yes**  | ZIP / postal code       |
| `country`    | enum      | **yes**  | `United States`, `Canada` |

## 3.5 Empty JSON Schema

```json
{
  "mailingAddress": {
    "streetOrPo": "",
    "city": "",
    "state": null,
    "zip": "",
    "country": null
  }
}
```

## 3.6 Populated JSON Schema

```json
{
  "mailingAddress": {
    "streetOrPo": "PO Box 8890",
    "city": "Wilmington",
    "state": "DE",
    "zip": "19899",
    "country": "United States"
  }
}
```

## 3.7 Relationships

- Independent of `legalMainAddress`.
- Backend should accept a boolean `sameAsLegal` during create if UI provides it.

---

# Section 4 — Fleet & Driver Overview

## 4.1 Purpose

Displays three counts that summarize the fleet: **Power Units**, **Drivers**,
**Non-CMV Vehicles**. Used on MCS-150, in BASIC percentile calculations,
and in unit-based compliance scoring.

## 4.2 ⚠️ This card is READ-ONLY (derived)

Although `UI_DATA.editModals.fleetDriverOverview` exists as an edit config,
the **actual UI renders `editable={false}`** and computes values from two
authoritative sources:

```ts
const fleetOverview = useMemo(() => {
  const activeAssets = INITIAL_ASSETS.filter(a => a.operationalStatus === 'Active');
  const powerUnits = activeAssets.filter(a => a.assetType === 'Truck').length;
  const nonCmv     = activeAssets.filter(a => a.assetCategory === 'Non-CMV').length;
  const driverCount = MOCK_DRIVERS.length;
  return { powerUnits, drivers: driverCount, nonCmv };
}, []);
```

The card shows a right-aligned note: **"Auto-synced from Asset Directory · Drivers"**.

### Derivation rules

| Displayed count | Formula                                                                               |
|-----------------|---------------------------------------------------------------------------------------|
| Power Units     | `INITIAL_ASSETS.filter(a => a.operationalStatus === "Active" && a.assetType === "Truck").length` |
| Drivers         | `MOCK_DRIVERS.length`                                                                  |
| Non-CMV         | `INITIAL_ASSETS.filter(a => a.operationalStatus === "Active" && a.assetCategory === "Non-CMV").length` |

## 4.3 UI Components

- **Read view:** `Card` titled "Fleet & Driver Overview", icon `Truck`, `editable={false}`
- **Edit:** none — users change these counts by editing Assets / Drivers
- Config (present but unused as editor): `UI_DATA.editModals.fleetDriverOverview`

## 4.4 Data Dictionary — `FleetDriverOverview` (derived shape)

| Attribute    | Data type | Source                                                     |
|--------------|-----------|------------------------------------------------------------|
| `powerUnits` | integer   | Count of active `Truck` assets                             |
| `drivers`    | integer   | Count of drivers                                           |
| `nonCmv`     | integer   | Count of active `Non-CMV` assets                           |

## 4.5 Empty JSON Schema (snapshot shape)

```json
{
  "fleetDriverOverview": {
    "powerUnits": 0,
    "drivers": 0,
    "nonCmv": 0
  }
}
```

## 4.6 Populated JSON Schema

```json
{
  "fleetDriverOverview": {
    "powerUnits": 80,
    "drivers": 120,
    "nonCmv": 0
  }
}
```

## 4.7 Relationships

- **Upstream (sources):** Asset Directory (`assets`), Drivers roster
  (`drivers`). If backend persists this snapshot, it should be recomputed on
  asset/driver mutations.
- **Downstream (consumers):** BASIC percentile calculation in Safety Analysis,
  MCS-150 biennial update export.

---

# Section 5 — Cargo Carried

## 5.1 Purpose

Commodities the carrier hauls. Shown as pill tags on the profile and used
by dispatch, insurance underwriting, hazmat triggers, and MCS-150.

## 5.2 UI Components

- **Read view:** `Card` titled "Cargo Carried", icon `Package`, editable
- **Edit:** `CargoEditorModal`
- Config:
  - Catalog: `UI_DATA.cargoEditor.sections` (4 groups)
  - Hazmat list: `UI_DATA.cargoEditor.hazmat`
  - Current selection: `UI_DATA.cargoEditor.values.selected`
- Canonical mapping for backend: `CARGO_FAMILY_MAPPING`
- Catalog is editable from `General Settings → Cargo Carrier`

## 5.3 Catalog sections (default items)

| Section key                | Label                          | # of default items |
|----------------------------|--------------------------------|--------------------|
| `generalFreight`           | GENERAL FREIGHT & HOUSEHOLD    | 17                 |
| `foodTemp`                 | FOOD & TEMPERATURE CONTROLLED  | 14                 |
| `constructionIndustrial`   | CONSTRUCTION & INDUSTRIAL      | 18                 |
| `other`                    | OTHER                          | 5                  |
| `hazmat` (separate)        | HAZARDOUS MATERIALS            | 5                  |

Default catalog items cannot be deleted. Users may add their own labels in
General Settings (they render with an "Added" badge).

## 5.4 Rendering rules

- Every selected label renders as a dark pill (`bg-slate-800`).
- `Explosives` and `Gases` render with a red pill (`bg-red-700 text-white`)
  to indicate hazmat emphasis.

## 5.5 Data Dictionary

### Entity — `CargoSelection` (profile storage)

| Attribute  | Data type | Required | Description                                |
|------------|-----------|----------|--------------------------------------------|
| `selected` | string[]  | **yes**  | Friendly commodity labels. May be empty.   |

### Entity — `CargoFamilyMapEntry` (backend canonical)

| Attribute | Data type | Required | Description                                                         |
|-----------|-----------|----------|---------------------------------------------------------------------|
| `family`  | enum      | **yes**  | One of: `Dry Van Cargo Family`, `Reefer Cargo Family`, `Flatbed Cargo Family`, `Tank Cargo Family`, `Hopper Cargo Family`, `Other Cargo Family` |
| `value`   | string    | **yes**  | Canonical `Family - Label`, e.g. `Dry Van - General Freight`        |

Helper: `resolveCargoFamilies(selected: string[]): CargoFamilyMapEntry[]`
— unknown labels fall back to `{ family: "Other Cargo Family", value: "Other - Other" }`.

## 5.6 Empty JSON Schema

```json
{
  "cargoCarried": {
    "selected": []
  }
}
```

## 5.7 Populated JSON Schema (frontend)

```json
{
  "cargoCarried": {
    "selected": [
      "General Freight",
      "Household Goods",
      "Building Materials",
      "Fresh Produce",
      "Refrigerated Food",
      "Beverages"
    ]
  }
}
```

## 5.8 Populated JSON Schema (canonical / backend)

```json
{
  "cargoCarried": [
    { "family": "Dry Van Cargo Family",  "value": "Dry Van - General Freight" },
    { "family": "Dry Van Cargo Family",  "value": "Dry Van - Household Goods" },
    { "family": "Flatbed Cargo Family",  "value": "Flatbed - Building Materials" },
    { "family": "Reefer Cargo Family",   "value": "Reefer - Fresh Produce" },
    { "family": "Reefer Cargo Family",   "value": "Reefer - Refrigerated Food" },
    { "family": "Dry Van Cargo Family",  "value": "Dry Van - Beverages" }
  ]
}
```

## 5.9 Relationships

- Hazmat selections (`Explosives`, `Gases`, `Flammable Liquids`, `Radioactive`,
  `Corrosives`) trigger downstream hazmat-specific compliance forms.
- `CARGO_FAMILY_MAPPING` is maintained in
  `src/pages/profile/carrier-profile.data.ts`.

---

# Section 6 — Corporate Office Locations

## 6.1 Purpose

The carrier's corporate offices (HQ, regional offices). Distinct from
"Yard Terminals" (the Locations tab) which tracks operational sites like
yards, fuel stops, and drop-yards.

## 6.2 UI Components

- **Read view:** `Card` titled "Corporate Office Locations" (full width), icon
  `MapPin`, with a table inside
- **Row actions:**
  - Click row → opens `LocationViewModal` (read-only)
  - Edit pencil → opens `LocationEditorModal` for that row
  - Trash icon → `handleDeleteOffice(id)` (with confirm)
  - "Add Location" button → opens `LocationEditorModal` empty
- Seed data: `OFFICE_LOCATIONS`
- Add/Edit modal config: `UI_DATA.editModals.addOfficeLocation`

## 6.3 Table columns

| Column   | Source                             |
|----------|------------------------------------|
| Label    | `label` (and `id` as subtext)      |
| Address  | `address`                          |
| Contact  | `contact`                          |
| Phone    | `phone`                            |
| Actions  | Edit + Delete buttons              |

## 6.4 Add / Edit Form

| Field     | Label            | Type    | Required | Notes                              |
|-----------|------------------|---------|----------|------------------------------------|
| `label`   | Location Label   | `text`  | ✅       | e.g. "Phoenix Branch"              |
| `address` | Full Address     | `text`  | ✅       | One-line address string            |
| `contact` | Contact Person   | `text`  | ✅       | Person name or role                |
| `phone`   | Phone Number     | `tel`   | ✅       | E.164 or local format              |

Layout: `[["label"], ["address"], ["contact","phone"]]`

> `operatingHours` is **not** in the add/edit form. Defaults are assigned
> on create (`Mon-Fri 08:00-18:00`, `Sat Closed`, `Sun Closed`) and can be
> edited in a future iteration of the modal.

## 6.5 Data Dictionary

### Entity — `OfficeLocation`

| Attribute        | Data type         | Required | Description                                                    |
|------------------|-------------------|----------|----------------------------------------------------------------|
| `id`             | string            | **yes**  | Pattern `LOC-XXXX`. Server-assigned. Display as row subtext.   |
| `label`          | string            | **yes**  | Display name.                                                  |
| `address`        | string            | **yes**  | Full one-line address.                                         |
| `contact`        | string            | **yes**  | Contact person or role.                                        |
| `phone`          | string            | **yes**  | Phone number.                                                  |
| `operatingHours` | `OperatingHour[]` | no       | Defaults applied on create; may be empty or missing.           |

### Entity — `OperatingHour`

| Attribute | Data type | Required | Description / Example                         |
|-----------|-----------|----------|-----------------------------------------------|
| `day`     | string    | **yes**  | `"Mon - Fri"`, `"Sat"`, `"Sun"`                |
| `hours`   | string    | **yes**  | `"08:00 - 18:00"` or `"Closed"`                |

## 6.6 Empty JSON Schema

```json
{
  "officeLocations": []
}
```

Single empty office record (for create):

```json
{
  "id": null,
  "label": "",
  "address": "",
  "contact": "",
  "phone": "",
  "operatingHours": []
}
```

## 6.7 Populated JSON Schema

```json
{
  "officeLocations": [
    {
      "id": "LOC-2001",
      "label": "Corporate HQ - Wilmington",
      "address": "1200 North Dupont Hwy, Wilmington, DE 19801",
      "contact": "Head Office",
      "phone": "+1 (555) 123-4567",
      "operatingHours": [
        { "day": "Mon - Fri", "hours": "08:00 - 18:00" },
        { "day": "Sat",       "hours": "10:00 - 14:00" },
        { "day": "Sun",       "hours": "Closed" }
      ]
    },
    {
      "id": "LOC-2002",
      "label": "Denver Regional Office",
      "address": "101 Broadway, Denver, CO 80203",
      "contact": "Regional Manager",
      "phone": "+1 (303) 555-0199",
      "operatingHours": [
        { "day": "Mon - Fri", "hours": "09:00 - 17:00" },
        { "day": "Sat",       "hours": "Closed" },
        { "day": "Sun",       "hours": "Closed" }
      ]
    }
  ]
}
```

## 6.8 Relationships

- Distinct from Yard Terminals (separate tab, different data model).
- IDs issued server-side (`LOC-XXXX`). Client's temporary ID strategy
  `LOC-${2000 + officeLocations.length + 1}` is for mock only.

---

# Section 7 — Directors & Officers

## 7.1 Purpose

Legal directors and officers of the carrier entity. Required for state
filings, ownership disclosure, and compliance reviews.

## 7.2 UI Components

- **Read view:** `Card` titled "Directors & Officers" (full width), icon
  `Users`, with a table inside
- **Table columns:** `Name`, `Title`, `Ownership %`, `Actions` (only a
  "View More" link)
- **Row flow:**
  - Click "View More" → `DirectorViewModal` (read-only)
  - From the view modal, "Edit" → `DirectorEditModal` with that director
  - "Add Director" button → `DirectorEditModal` empty
- Seed data: `DIRECTOR_UI.directors`
- View modal config: `DIRECTOR_UI.viewModal`
- Edit modal config: `DIRECTOR_UI.editModal`

> Unlike Office Locations, Directors do **not** have inline Edit/Delete
> icons in the table row. Deletion is handled via the edit modal or omitted.

## 7.3 View Modal layout (`DIRECTOR_UI.viewModal.sections`)

| Section key | Section label          | Fields shown                                                   |
|-------------|------------------------|----------------------------------------------------------------|
| `contact`   | CONTACT INFORMATION    | `email`, `phone`, `office` *(legacy, may be hidden)*           |
| `role`      | ROLE & COMPLIANCE      | `dateAppointed`, `dateResigned`, `responsibility`              |

## 7.4 Edit Form (current rules — post-2026-04-22)

Config: `DIRECTOR_UI.editModal`

| Field            | Label                  | Type        | Required | Notes                                            |
|------------------|------------------------|-------------|----------|--------------------------------------------------|
| `name`           | Full Name              | `text`      | ✅       | ≤ 120 chars                                      |
| `role`           | Role Title             | `text`      | ❌       | e.g. "VP of Operations"                          |
| `email`          | Email Address          | `email`     | ✅       | RFC 5322                                         |
| `phone`          | Phone Number           | `tel`       | ✅       | E.164 recommended                                |
| `stockClass`     | Stock Class            | `text`      | ❌       | e.g. "Class A Common Stock"                      |
| `ownershipPct`   | Ownership %            | `number`    | ✅       | 0–100                                            |
| `dateAppointed`  | Date of Appointment    | `date`      | ❌       | ISO `YYYY-MM-DD`                                 |
| `dateResigned`   | Date of Resignation    | `date`      | ❌       | Empty string = still active                      |
| `responsibility` | Primary Responsibility | `textarea`  | ❌       | 4 rows placeholder text                          |

Layout: `[["name","role"], ["email","phone"], ["stockClass","ownershipPct"], ["dateAppointed","dateResigned"], ["responsibility"]]`

> **Removed:** `office` (Office Location) field — removed from the edit form
> on 2026-04-22. Retained in `viewModal.contact` for backward compatibility
> and in the data shape.

The modal:

- Renders a red `*` next to required labels
- Blocks save and shows inline rose errors if any required field is blank
- Clears a field's error the moment the user edits it

## 7.5 Data Dictionary — `Director`

| Attribute        | Data type | Required | Format / Range   | Description                                                     |
|------------------|-----------|----------|------------------|-----------------------------------------------------------------|
| `name`           | string    | **yes**  | ≤ 120 chars      | Full legal name.                                                |
| `role`           | string    | no       | ≤ 80 chars       | Title within the company.                                       |
| `initials`       | string    | derived  | 2–3 chars        | Computed client-side from `name` if absent.                     |
| `since`          | string    | derived  | "MMM YYYY"       | Human-readable month/year from `dateAppointed`.                 |
| `isPrimary`      | boolean   | no       | —                | At most one director per carrier may be primary.                |
| `stockClass`     | string    | no       | ≤ 80 chars       | Equity class.                                                   |
| `ownershipPct`   | number    | **yes**  | 0–100            | Equity ownership percentage.                                    |
| `email`          | string    | **yes**  | RFC 5322         | Contact email.                                                  |
| `phone`          | string    | **yes**  | E.164 or local   | Contact phone.                                                  |
| `office`         | string    | no       | ≤ 200 chars      | Legacy — not editable in current form.                          |
| `dateAppointed`  | string    | no       | `YYYY-MM-DD`     | Appointment date.                                               |
| `dateResigned`   | string    | no       | `YYYY-MM-DD` or "" | Resignation date. Empty = still active.                        |
| `responsibility` | string    | no       | ≤ 500 chars      | Free-text description of oversight scope.                       |

## 7.6 Invariants (business rules)

- `Σ ownershipPct` across **active** directors should be ≤ 100.
- At most one director has `isPrimary === true`.
- A director is **active** iff `dateResigned` is `""` / null / undefined.
- Validation is applied only to fields marked `required` in config —
  backend should mirror these rules.

## 7.7 Empty JSON Schema

```json
{
  "directors": []
}
```

Single empty director record (for create):

```json
{
  "name": "",
  "role": "",
  "initials": "",
  "since": "",
  "isPrimary": false,
  "stockClass": "",
  "ownershipPct": 0,
  "email": "",
  "phone": "",
  "office": "",
  "dateAppointed": "",
  "dateResigned": "",
  "responsibility": ""
}
```

## 7.8 Populated JSON Schema

```json
{
  "directors": [
    {
      "name": "Johnathan Doe",
      "role": "Director of Operations",
      "initials": "JD",
      "since": "Jan 2019",
      "isPrimary": true,
      "stockClass": "Class A Common Stock",
      "ownershipPct": 65,
      "email": "j.doe@acmetrucking.com",
      "phone": "+1 (555) 123-4567",
      "office": "1200 North Dupont Hwy, Wilmington, DE",
      "dateAppointed": "2019-01-15",
      "dateResigned": "",
      "responsibility": "Operations"
    },
    {
      "name": "Sarah Smith",
      "role": "VP of Operations",
      "initials": "SS",
      "since": "Mar 2020",
      "isPrimary": false,
      "stockClass": "Class B Common Stock",
      "ownershipPct": 35,
      "email": "s.smith@acmetrucking.com",
      "phone": "+1 (555) 987-6543",
      "office": "1200 North Dupont Hwy, Wilmington, DE",
      "dateAppointed": "2020-03-10",
      "dateResigned": "",
      "responsibility": "Compliance"
    }
  ]
}
```

---

## 11. Consolidated Carrier Profile Payload

The complete contract between frontend and backend for the Carrier Profile
(Fleet Overview tab scope).

### 11.1 Empty schema (for creating a new carrier)

```json
{
  "id": null,
  "header": {
    "name": "",
    "status": "Active"
  },
  "corporateIdentity": {
    "dotNumber": "",
    "cvorNumber": "",
    "nscNumber": "",
    "rinNumber": "",
    "legalName": "",
    "dbaName": "",
    "businessType": null,
    "stateOfInc": null,
    "extraProvincial": null
  },
  "operationsAuthority": {
    "operationClassification": null,
    "carrierOperation": null,
    "fmcsaAuthorityType": null
  },
  "legalMainAddress": {
    "country": null,
    "street": "",
    "apt": "",
    "city": "",
    "state": null,
    "zip": ""
  },
  "mailingAddress": {
    "streetOrPo": "",
    "city": "",
    "state": null,
    "zip": "",
    "country": null
  },
  "fleetDriverOverview": {
    "powerUnits": 0,
    "drivers": 0,
    "nonCmv": 0
  },
  "cargoCarried": {
    "selected": []
  },
  "officeLocations": [],
  "directors": []
}
```

### 11.2 Populated schema (realistic example)

```json
{
  "id": "carrier_01HV8NXAN2WX3MJK5T7QZABC",
  "header": {
    "name": "Acme Trucking Inc.",
    "status": "Active"
  },
  "corporateIdentity": {
    "dotNumber": "3421765",
    "cvorNumber": "CVOR-00123",
    "nscNumber": "AB-12345",
    "rinNumber": "RIN-0099",
    "legalName": "Acme Trucking Inc.",
    "dbaName": "Acme Logistics",
    "businessType": "Corporation",
    "stateOfInc": "Delaware",
    "extraProvincial": "Yes"
  },
  "operationsAuthority": {
    "operationClassification": "Authorized for Hire",
    "carrierOperation": "Intrastate Only (Non-Hazmat)",
    "fmcsaAuthorityType": "Motor Carrier of Property"
  },
  "legalMainAddress": {
    "country": "United States",
    "street": "1200 North Dupont Highway",
    "apt": "",
    "city": "Wilmington",
    "state": "DE",
    "zip": "19801"
  },
  "mailingAddress": {
    "streetOrPo": "PO Box 8890",
    "city": "Wilmington",
    "state": "DE",
    "zip": "19899",
    "country": "United States"
  },
  "fleetDriverOverview": {
    "powerUnits": 80,
    "drivers": 120,
    "nonCmv": 0
  },
  "cargoCarried": {
    "selected": [
      "General Freight",
      "Household Goods",
      "Building Materials",
      "Fresh Produce",
      "Refrigerated Food",
      "Beverages"
    ]
  },
  "officeLocations": [
    {
      "id": "LOC-2001",
      "label": "Corporate HQ - Wilmington",
      "address": "1200 North Dupont Hwy, Wilmington, DE 19801",
      "contact": "Head Office",
      "phone": "+1 (555) 123-4567",
      "operatingHours": [
        { "day": "Mon - Fri", "hours": "08:00 - 18:00" },
        { "day": "Sat",       "hours": "10:00 - 14:00" },
        { "day": "Sun",       "hours": "Closed" }
      ]
    }
  ],
  "directors": [
    {
      "name": "Johnathan Doe",
      "role": "Director of Operations",
      "isPrimary": true,
      "stockClass": "Class A Common Stock",
      "ownershipPct": 65,
      "email": "j.doe@acmetrucking.com",
      "phone": "+1 (555) 123-4567",
      "dateAppointed": "2019-01-15",
      "dateResigned": "",
      "responsibility": "Operations"
    }
  ]
}
```

### 11.3 Validation summary (what MUST be valid for save)

| Section               | Validation                                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------------------------|
| Corporate Identity    | `legalName`, `businessType`, `stateOfInc` are required.                                                        |
| Operations & Authority| All optional.                                                                                                  |
| Legal / Main Address  | All optional by config — treat incomplete as "warning".                                                        |
| Mailing Address       | `streetOrPo`, `city`, `state`, `zip`, `country` all required.                                                  |
| Fleet & Driver Overview | Derived — no user validation.                                                                                |
| Cargo Carried         | `selected` must be an array (may be empty).                                                                    |
| Office Locations      | Per item: `label`, `address`, `contact`, `phone` required.                                                     |
| Directors & Officers  | Per item: `name`, `email`, `phone`, `ownershipPct` required. Σ `ownershipPct` ≤ 100 across active directors.   |

---

## 12. Cheat Sheet

One-table overview of every section's contract.

| Section                     | JSON key                | Kind      | Required fields                                                       |
|-----------------------------|-------------------------|-----------|-----------------------------------------------------------------------|
| General Information         | `corporateIdentity`     | object    | `legalName`, `businessType`, `stateOfInc`                             |
| General Information         | `operationsAuthority`   | object    | —                                                                     |
| Legal / Main Address        | `legalMainAddress`      | object    | — (recommended: all)                                                  |
| Mailing Address             | `mailingAddress`        | object    | `streetOrPo`, `city`, `state`, `zip`, `country`                       |
| Fleet & Driver Overview     | `fleetDriverOverview`   | object    | (derived)                                                             |
| Cargo Carried               | `cargoCarried`          | object    | `selected` (array, may be empty)                                      |
| Corporate Office Locations  | `officeLocations`       | array     | `label`, `address`, `contact`, `phone` per item                       |
| Directors & Officers        | `directors`             | array     | `name`, `email`, `phone`, `ownershipPct` per item                     |

---

## 13. Change Log

| Date       | Change                                                                                                                                  |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| 2026-04-22 | Initial document.                                                                                                                       |
| 2026-04-22 | Director: `office` removed from edit form; required set trimmed to `name`, `email`, `phone`, `ownershipPct`.                            |
| 2026-04-22 | Rev 1.1 — Corrected: Fleet & Driver Overview is read-only/derived from Asset Directory + Drivers; General Info is one consolidated card with Carrier Risk Score; Directors table has "View More" only (no inline edit/delete); tabs documented; embedded pages listed. |
| 2026-04-22 | Rev 1.2 — Added §4 Save Flow (per-modal save button, handleModalSave router, backend contract suggestion, state/error UI) and §5 DOT Lookup / SAFER Sync (full lifecycle, pre-filled fields, mock vs real, reminder that Save is still required). |
