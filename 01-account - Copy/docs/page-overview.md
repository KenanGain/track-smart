# 01 – Account · Page Overview

**App:** TrackSmart (fleet compliance prototype) · **Section:** sidebar menu #1 "Account" · **Documented:** 2026-10-22 · **Source of truth:** the running app (test accounts only) cross-checked against `src/pages/profile/CarrierProfilePage.tsx` and the pages it embeds.

> Everything below exists in the app today. Anything not seen on screen is marked **ASSUMPTION:** (inferred from code) or **TO CONFIRM:** (needs a product decision or a check I could not make).

---

## 0. Entry point and frame

| Item | Value |
|---|---|
| Sidebar item | **Account** (icon: building) |
| Route | `/account/profile` |
| Top-bar title | "Carrier Fleet Profile" |
| Page header | Icon + title **Carrier Fleet Profile**, subtitle `"<Carrier name> — <n> assets · <n> drivers"`, then the 4 section tabs. The header condenses (shrinks) as the body scrolls down and returns on scroll up. |
| Carrier scope | The page always shows **one carrier** – the one picked in the top-bar **Switch carrier** dropdown (Super Admin / Admin) or the user's own carrier. Every tab, count and list is scoped to that carrier. |
| Back button | When the page was opened from another record (a share link, a monitoring alert), a "← Back to …" button appears at the right of the header. Otherwise no header action. |
| Section tabs | `Fleet Overview` · `Yard Terminals` · `Assets <count>` · `Drivers <count>` (tab strip scrolls with arrows when narrow) |

### Page-level states

| State | What the user sees |
|---|---|
| **No carrier** | "No carrier profile yet" empty page: "You don't have any carrier accounts (under *Service Profile*) assigned to you yet." + note "Access per role is set in Users & Roles ▸ Roles." + button **Go to Dashboard**. |
| **Loading** | None. Data is local (localStorage-backed stores); tabs render immediately. ASSUMPTION: a real backend would need a skeleton here. |
| **View-only (light access)** | A blue strip under the top bar: "**View only** · a *Safety Manager* can look at Account here but not change it." (see §6 Roles). |
| **Success** | Green toast bottom-right after every save/import/delete (exact messages listed per tab). |
| **Error** | Inline red field messages inside wizards (Assets); `window.confirm()` dialogs before every row delete; no global error page. |

---

## 1. Tree (what exists inside Account)

```
Account  (/account/profile)
├── Fleet Overview
│   ├── Carrier identity card         [Edit → "Edit Corporate Identity" modal]
│   ├── Operations & Authority card   [Edit → "Operations & Authority" modal]
│   ├── Legal / Main Address card     [Edit → modal]
│   ├── Mailing Address card          [Edit → modal]
│   ├── Fleet & Driver Overview card  [Edit → modal]  (Carrier risk score, Power units, Drivers, Non-CMV)
│   ├── Cargo Carried card            [Edit → "Cargo types" editor]
│   ├── Corporate Office Locations    [Add Location / Edit Location / Remove Location → "Add/Edit Office Location" modal]
│   └── Directors & Officers          [Add Director / View More → "Director Details" modal → Edit → "Edit Director" modal]
├── Yard Terminals   (embedded Locations page; also reachable standalone at /account/locations)
│   ├── Add New Location              → "Add New Location" modal
│   ├── Filters: search · Status · Security
│   ├── Locations table (grouped)     row click → "Location" view modal; ⋮ Open / Edit / Share to chat / Delete
│   └── Pagination
├── Assets   (embedded Asset Directory)
│   ├── KPI tiles (6)  · sub-tabs All / Trucks (CMV) / Trailers (Non-CMV)
│   ├── Search · Columns · Export · Add Asset
│   ├── Assets table: inline Status dropdown · ⋮ Open / Edit / Share to chat / Delete · pagination
│   ├── Add / Edit Asset  → full-screen wizard, 9 sections
│   └── Asset detail page → header tiles + 11 tabs (Overview, Monitoring, Compliances, Activity, Maintenance, Inventory, Expenses, Inspections, Violations, Accidents, Notifications)
└── Drivers
    ├── KPI tiles (5) · Search · Status filter · Columns · Export · Import · Add Driver
    ├── Drivers table: inline Status dropdown · ⋮ Open / Edit / Share to chat / Open DQ file / Delete · pagination
    ├── Import drivers  → "Import Drivers" modal (CSV / XLSX)
    ├── Add / Edit Driver → full-page application form, 15 sections + driver-type picker
    └── Driver profile page → header (status dropdown, Share to chat, Print, Edit Profile) + 13 tabs
```

---

## 2. Tab: Fleet Overview

**Purpose.** The carrier's legal identity and operating authority as filed (USDOT / CVOR / NSC), its addresses, fleet size, cargo, corporate offices and directors. Read mostly; every card has one pencil that opens a modal for that card only.

### 2.1 Carrier identity card (top-left of the big card)

Displayed: carrier name, **DOT:** number, **CVOR/NSC/RIN:** number(s), MC number (from the MC Certificate record), status chip, and fields **Legal name · DBA name · Business type · State of inc. · Extra-provincial**. Hover titles explain each number (e.g. "US Federal Motor Carrier Safety Administration USDOT Number").

Icon button (pencil, no label) → **Edit Corporate Identity** modal:

| Field | Type | Required | Options / placeholder / rules |
|---|---|---|---|
| DOT Number | text + **LOOKUP** button | no | placeholder `1234567`; helper "Click Lookup to pull SAFER record" (TO CONFIRM: lookup is a demo stub) |
| Safety Registration | select | no | `CVOR`, `NSC` |
| CVOR / NSC Number | text | no | placeholder changes with the select: `CVOR-00123` / `AB-12345` |
| RIN | text | no | placeholder `RIN-0099`; helper "Registered Importer / Registration Identification Number." |
| Legal Name | text | **yes** | placeholder `Acme Trucking Inc.` |
| DBA Name | text | no | placeholder `Acme Logistics` |
| Business Type | select | **yes** | Corporation · LLC · Sole Proprietor · Partnership |
| State of Inc. | select | **yes** | Delaware · California · Texas · Florida · New York (TO CONFIRM: full state list) |
| Extra-Provincial | select | no | Yes · No; helper "Operates commercial vehicles across provincial or federal borders." |
| Status | select | **yes** | Active · Inactive · Suspended · Pending |

Buttons: **Cancel** · **Save**. Success toast "Changes saved successfully". ASSUMPTION: required fields are marked but the generic modal does not block Save on empty values (TO CONFIRM).

### 2.2 Operations & Authority card

Displayed: **Operation classification · Carrier operation · Hazardous materials · Authority types** as chips.

Icon button (pencil) → **Operations & Authority** modal:

| Field | Type | Options |
|---|---|---|
| Operation Classification | checkbox list | Authorized for Hire · Private Carrier · Exempt For Hire |
| Carrier Operation | check cards | Interstate · Intrastate · Cross-Border |
| Hazardous Materials | check cards | Hazmat · Non-Hazmat |
| FMCSA Operating Authority Types | checkbox list | Motor Carrier of Property · Motor Carrier of Household Goods · Broker of Property |

Buttons: Cancel · Save → toast "Changes saved successfully".

### 2.3 Legal / Main Address card → **Edit Section**

| Field | Type | Required | Options / placeholder |
|---|---|---|---|
| Country | select | no | United States · Canada |
| Street Address | text | no | `1200 North Dupont Highway` |
| Apartment, suite, etc. | text | no | `(Optional)` |
| City | text | no | `Wilmington` |
| State | select | no | DE · NY · CA · TX (TO CONFIRM: full list) |
| ZIP Code | text | no | `19801` |

### 2.4 Mailing Address card → **Edit Section**

| Field | Type | Required | Placeholder / options |
|---|---|---|---|
| Street Address or PO Box | text | **yes** | `PO Box 8890` |
| City | text | **yes** | `Wilmington` |
| State | select | **yes** | DE · NY · CA · TX |
| ZIP Code | text | **yes** | `19899` |
| Country | select | **yes** | United States · Canada |

### 2.5 Fleet & Driver Overview card → **Edit Section**

Displayed tiles: **Carrier risk score** (computed, read-only) · **Power units** · **Drivers** · **Non-CMV**.

| Field | Type | Required | Note |
|---|---|---|---|
| Power Units | number | **yes** | info icon |
| Drivers | number | **yes** | info icon |
| Non-CMV Vehicles | number | no | helper "Vehicles under 10,001 lbs." |

### 2.6 Cargo Carried card → pencil → **Cargo types** editor

- Note on the card: "Updated from MCS-150".
- Modal: search box (placeholder "Search cargo type…") + checklist of cargo types (the MCS-150 cargo classifications, e.g. General Freight, Household Goods, Metal, Motor Vehicles, Logs, …). Each label maps to a canonical cargo family internally.
- Buttons: Cancel · Save → toast "Cargo Types updated successfully".

### 2.7 Corporate Office Locations card

Table columns: **Label · Address · Contact · Phone · Actions**. Row actions: **Edit Location** (pencil) · **Remove Location** (bin; removes immediately, no confirm — TO CONFIRM whether a confirm is wanted). Header button **+ Add Location**.

**Add Office Location / Edit Office Location** modal:

| Field | Type | Required | Placeholder |
|---|---|---|---|
| Location Label | text | **yes** | `e.g. Phoenix Branch` |
| Full Address | text | **yes** | `123 Main St, Phoenix, AZ 85001` |
| Contact Person | text | **yes** | `Manager Name` |
| Phone Number | tel | **yes** | `+1 (555) 000-0000` |
| Operating hours – Mon - Fri | text | no | `08:00 - 18:00` |
| Operating hours – Saturday | text | no | `10:00 - 14:00` |
| Operating hours – Sunday | text | no | `Closed` |

Toasts: "Office Location added successfully" / "Office Location updated successfully".

### 2.8 Directors & Officers card

Table columns: **Name · Title · Ownership % · Actions**. Row action **View More** → **Director Details** modal (read-only): avatar/name/title, *Contact information* (Email Address, Phone Number, Office Location), *Role & compliance* (Date of Appointment, Date of Resignation, Primary Responsibility) + **Edit** button. Header button **+ Add Director**.

**Edit Director / Add Director** modal:

| Field | Type | Required | Note |
|---|---|---|---|
| Full Name | text | **yes** | |
| Role Title | text | no | |
| Email Address | email | **yes** | |
| Phone Number | tel | **yes** | |
| Stock Class | text | no | |
| Ownership % | number | **yes** | |
| Date of Appointment | date | no | |
| Date of Resignation | date | no | |
| Primary Responsibility | textarea (4 rows) | no | placeholder "Describe this director's primary areas of responsibility and oversight..." |

Toasts: "Director added successfully" / "Director updated successfully". TO CONFIRM: there is no delete for a director.

---

## 3. Tab: Yard Terminals

**Purpose.** The carrier's yards / terminals with their physical-security profile and a security score. This is the Locations page embedded (same page is reachable standalone at `/account/locations`, with a breadcrumb; the tab hides the breadcrumb).

**Header action:** **+ Add New Location**.

**Filters**

| Control | Type | Options |
|---|---|---|
| Search | text | placeholder "Search by name, address, or ID..." (matches name and ID) |
| Status | select | All · Active · Maintenance |
| Security | select | All · High (90+) · Medium (70-89) · Low (<70) — TO CONFIRM: the filter code currently matches on feature names (Fenced/Gated/CCTV/Guarded), so the score-band options have no effect. |

**Table** (rows grouped with a band per group, e.g. "3 LOCATIONS")

Columns: Location Name / ID · Address · Fenced · Gated · CCTV · Guard · Restricted (icon columns, ✓/–) · Score (0-100 with tone: ≥90 Excellent, ≥75 Good, ≥60 Fair, else Low) · Status chip (Active / Maintenance / Deactivated) · Actions ⋮.

Row click → **Location** view modal (name, ID, address, time zone, score circle with label, the 5 security features as on/off list). ⋮ menu: **Open yard terminal · Edit yard terminal · Share to chat · Delete yard terminal** (red, last; asks `Delete yard terminal <name>? This cannot be undone.`). Delete → toast "Location removed successfully". Footer: rows-per-page select (5 · 10 · 20 · 50) and page buttons.

**Add New Location / Edit Location** modal

| Field | Type | Required | Options / placeholder |
|---|---|---|---|
| Location Name | text | **yes** (ASSUMPTION) | `e.g. West Coast Distribution` |
| Location ID | text | no | default `LOC-`, placeholder `LOC-####` |
| Address – Street | text | no | `Street Address` |
| Address – City / State / Zip | text ×3 | no | `City` / `State` / `Zip` |
| Timezone | select, grouped | no | groups North America · South America · Europe · Africa · Middle East · Asia · Oceania · UTC |
| Initial Status | select | no | Active · Deactivated |
| Security features | 5 toggles | no | Fenced Perimeter · Gated Entry · CCTV Surveillance · Security Guard · Restricted Areas (each with a one-line description) |

Buttons: Cancel · Save. Empty state: "No locations match these filters." Pagination: prev / page numbers / next.

---

## 4. Tab: Assets

**Purpose.** The carrier's fleet register: every truck, trailer and non-CMV vehicle, its plate, ownership, compliance gaps, and the door into the asset's full record.

### 4.1 List

- **KPI tiles** (click = filter, click again = clear): Total Assets · Active · Maintenance · Out of Service · Draft · Deactivated.
- **Sub-tabs:** All Assets · Trucks (CMV) · Trailers (Non-CMV) (with counts).
- **Toolbar:** Search ("Search by Unit #, VIN, make, model, plate, year…") · **Columns** picker · **Export** (TO CONFIRM: no-op in the prototype) · **+ Add Asset** (primary).
- **Columns:** Unit # · Type (asset type · vehicle type) · Status (inline dropdown) · Plate (number + jurisdiction) · Plate expiry (date + EXPIRED/Expiring chip) · Make / Model / Year (+ VIN, colour) · Ownership (Owned / Leased / Financed / Rented) · Compliance ("n missing" chip) · Date added · Actions.
- **Inline Status dropdown** options: Active · Maintenance · Out of Service · Draft · Deactivated → saves immediately, toast confirms the change.
- **⋮ row menu:** Open asset · Edit asset · Share to chat · Delete asset (red; `Delete asset <unit>? This cannot be undone.`).
- Row click opens the asset detail page. Pagination at the bottom. Empty state: "No assets found".
- **Share to chat** dialog (same everywhere): Send via In-app chat / External chat / Email, recipient, subject, message with the unit's facts, attached documents.

### 4.2 Add Asset / Edit Asset (full-screen wizard)

Header: "← Back to assets", title "Register Asset" / "Edit <unit>", buttons **Discard** and **REGISTER ASSET** (or **Save changes**). Left rail lists the 9 sections with a completion count; clicking scrolls to the section.

| # | Section | Fields (label — type — required — rules/options) |
|---|---|---|
| 1 | Asset class | Asset Type — select — yes — Truck · Trailer · Non-CMV Vehicle (sets the CMV / Non-CMV category). Vehicle Type — select — no — Truck: Power Unit · Straight Truck · Tanker · Other; Trailer: Dry Van · Flatbed · Reefer · Other; Non-CMV: Pickup · Van · SUV · Other. "Vehicle type — other" — text — shown when Other. |
| 2 | Vehicle info | Unit Number* — text — placeholder `TR-100`. VIN (17 characters)* — text — exactly 17 chars, mono. **LOOKUP** button beside the VIN (TO CONFIRM: decode stub). Manufacturer/Make* — `Freightliner`. Model* — `Cascadia`. Year — number — 1900 … current year + 2. Color — `e.g. White`. Gross Weight (Loaded) — number + unit lbs/kg. Unloaded Weight — number + unit lbs/kg. |
| 3 | Registration & plate | Plate Number — `ABC-1234`. Plate Type — select — IRP · Local (hint: IRP for interjurisdictional running). Plate Country — USA · Canada. Plate State/Province — list follows the country. Issue Date — date. Expiry Date — date. **Monitoring block:** Monitor based on — radio Expiry Date / Issue Date; Recurrence — select; Reminders (days before) — checkboxes 90 · 60 · 30 · 7; Channels — checkboxes Email · In-app · SMS. |
| 4 | Yard / terminal | Location Name — select — Unassigned + the carrier's yards. |
| 5 | Driver assignment | **Assign Driver (n/2)** button adds a row (max 2): Driver Name* — select from roster; Assignment Date* — date; Date Monitoring / End Date — date. |
| 6 | Annual safety | The last annual safety inspection: Performed on — date; Odometer — `e.g. 412,500`; Operating hours — `e.g. 6,110`; Vendor — Shop name; Performed by — vendor / driver / mechanic; Driver — select; Mechanic name — `Dale Foster`; Labour / Parts — decimal; Currency — USD/CAD; Notes on this service; Remarks for next time. |
| 7 | Ownership & financial | Ownership Structure — select — Owned · Leased · Financed · Rented. Current Market Value — number + currency USD/CAD. **Bill of sale record:** Record Name (`Bill of Sale`), Purchase Price, Seller (`Dealer or seller as named on the bill`), Street Address, City, Zip / Postal Code, Bill of Sale — file upload. Depending on structure: Leasing Company (`e.g. Ryder`) · Lien Holder Business (`e.g. Fleet Finance LLC`) · Rental Agency Name (`e.g. Enterprise`) · Monthly Payment. |
| 8 | Insurance & status | Liability Policy Number — `Policy number on the slip`. Slip Expiry — date. Proof of Automobile Insurance Card (pink slip) — upload. Operational Status — select (same 5 statuses). Date Added to Fleet* — date. Date Added to Insurance* — date (required when Active). Odometer* — number + unit mi/km. When status is Deactivated: Date Removed from Fleet* and Date Removed from Insurance. When Out of Service: notice "Asset is marked Out of Service. No additional fleet dates required." |
| 9 | Notes | Notes (max 2000 chars) — textarea. |

Validation: inline red messages ("Required", "Must be 17 characters"); the save button submits only when the schema passes. Saving returns to the list with the new/updated row (toast). Saving a bill of sale also files a Bill of Sale document on the asset's Compliances tab.

### 4.3 Asset detail page

Opened from a row or from ⋮ Open. Header band: "← Back to Assets" breadcrumb strip, vehicle icon with status dot, title "<year make model>", chips (status, vehicle type), meta (drivers assigned, location, Added date), buttons **Share to chat** and **Edit Vehicle** (opens the wizard). Tiles: Odometer · Risk score · Health · Plate expiry. Metadata block: Unit #, VIN, Plate #, Plate state, Plate expiry, weights, GVWR class, Ownership, Market value, Date added. The header condenses on scroll.

| Tab | Purpose |
|---|---|
| Overview | Summary cards, recent activity, open items. |
| Monitoring | Every monitored date on this unit (plate, insurance, inspections…) with priority, due, status, who is notified; actions per row. |
| Compliances | The unit's compliance records and documents (upload, versions, status). |
| Activity | What was done about this unit's monitored items (the action log). |
| Maintenance | Service intervals, work orders and service history for the unit. |
| Inventory | Items issued to the unit (transponder, cards, keys). |
| Expenses | Costs recorded against the unit. |
| Inspections | Roadside/DOT inspections involving the unit. |
| Violations | Violations recorded against the unit. |
| Accidents | Accident records involving the unit. |
| Notifications | Alerts raised for the unit (count badge). |

---

## 5. Tab: Drivers

**Purpose.** The carrier's driver roster: who is on it, their status, licence, compliance gaps, and the way into each driver's full file.

### 5.1 List

- **KPI tiles** (click to filter): Total · Active · Inactive · On Leave · Terminated.
- **Toolbar:** Search ("Search name, ID, email, phone, license…", with clear ×) · Status filter select (All statuses · Active · Inactive · On Leave · Terminated; shows a removable "Status: …" chip) · **Columns** picker (Driver · Hired · Added to fleet · Status · Compliance · DQ File · License · Contact) · **Export** (TO CONFIRM: no-op) · **Import** · **+ Add Driver** (primary).
- **Columns:** Driver (avatar initials, name) · Hired (date) · Added to fleet (date; hover "When the driver was added to the fleet") · Status (inline dropdown) · Compliance ("n missing" chip) · DQ File (completion % + "n missing") · License (number · exp date) · Contact (phone, email) · Actions. Hired, Added to fleet, Status and License are sortable.
- **Inline Status dropdown** options: Active · On Leave (break) · Inactive · Terminated → saves immediately, toast "<name> is now <status>".
- **⋮ row menu:** Open driver · Edit driver · Share to chat · Open DQ file (goes to DQ Files) · Delete driver (red; `Delete driver <name>? This cannot be undone.`).
- Row click opens the driver profile. Pagination. Empty state: "No drivers found".

### 5.2 Import drivers modal

Upload a `.csv`, `.xlsx` or `.xls`. The modal lists the accepted columns (header match is case/space-insensitive): First Name*, Last Name*, Driver Type, Email, Phone, Date of Birth (YYYY-MM-DD), Gender, SSN / SIN, Citizenship (USA/Canada), Street Address, Unit / Apt, City, State / Province, Zip / Postal, Country, License Number, License State, License Class, License Expiry, Date Hired, Status (Active / Inactive / On Leave / Terminated). Shows a preview of parsed rows; **Import** → toast "n drivers imported successfully". TO CONFIRM: template download.

### 5.3 Add Driver / Edit Driver (full-page application form)

Same form as the hiring application, rendered as one scrolling page. Header: **Cancel** · **Fill sample data** (demo helper) · **Save Driver**. Top: driver-type picker **US Only Driver (United States) · Canada Only Driver (Canada) · Canada (Cross Border) (Canada / US)** – it switches labels (SSN vs SIN), regions and the Hours-of-Service window (8 days US, 14 days Canada/Cross-border). Left rail lists the 15 sections with a filled-field count.

| # | Section | Fields |
|---|---|---|
| 1 | Applicant Information | First Name, Middle Name, Last Name, Email, Phone Number, Date of Birth (mm/dd/yyyy picker), SSN / SIN, Gender, Position Type (select), "Will this driver operate in or cross into the United States?" Yes/No |
| 2 | Address Details | Street Address (line 1), Street Address (line 2), Country (US/Canada), City, State / Province, Zip / Postal Code, "Residence 3+ years?" Yes/No → No opens a previous-address block (repeatable) |
| 3 | Emergency Contact | Contact name, Relationship (`e.g. Spouse, Parent, Friend`), Phone, Email |
| 4 | License Details (repeatable, "Add Another License") | License front / back uploads (PNG, JPG, PDF ≤10MB), License Number, Country, Licensing Authority, License Class (searchable: Class 1 / A, Class 2 / B, Class 3 / C, Class 4 / D, Class 5 / G, Class M), Current driver license? Y/N, Commercial (CDL)? Y/N, Expiration Date, Endorsements (None · Other · Tanker · Doubles / Triples · X Endorsement · HazMat), Restrictions on license? Y/N → Restrictions comment box |
| 5 | License Disqualification | 6 Yes/No questions: ever denied / suspended / revoked; convicted of driving during suspension; alcohol / controlled-substance offense; illegal substance possession / sale; reckless / careless driving conviction; failed / refused a DOT drug or alcohol test (each Yes opens a detail box) |
| 6 | Travel Documents | Citizenship country, Work authorization in <country> (and in the United States for cross-border), Passport Number, Passport expiry, Visa held? + Visa Number, TWIC Card held?, FAST Card held? (each with upload) |
| 7 | Driving Experience (repeatable) | Equipment Class, Freight Types, Regions Driven, Dates (from / to), Approximate Miles, Owner-operator? Y/N |
| 8 | Employment Details (repeatable) | Company Name, Dates, Position Held, Location, Reason for leaving, Current employer? Y/N, Operated CMV? Y/N |
| 9 | Employment Gaps | "Any gaps?" Yes → repeatable Dates + Comments |
| 10 | Education Details | Yes → repeatable School name, Dates, Location, Studied, Graduation |
| 11 | Accident Details | Yes → repeatable Date of Accident, Type, State / Prov, Commercial vehicle? , At fault?, Ticketed?, Details |
| 12 | Traffic Violation Details | Yes → repeatable Violation Date, Charge / Description, State / Prov, Commercial Vehicle?, Penalty, Fine Amount |
| 13 | Military Service | "Were you ever in the military?" Yes/No (+ branch / dates when Yes) |
| 14 | Hours of Service | Last 8 (US) or 14 (Canada / Cross-border) days from the date of hire: a day-by-day table (two rows of 7 when 14), hours per day, total, Notes |
| 15 | Signature & Declarations | Declaration text, Applicant Name, Date Signed, Signature pad, Certification checkbox |

Saving: **Save Driver** creates/updates the roster record, files the travel documents to the driver's compliance records (toast "n travel documents filed to compliance — …"), toast "Driver added successfully" / "Driver updated successfully". ASSUMPTION: no field is hard-required to save in page mode (TO CONFIRM which should block Save).

### 5.4 Driver profile page

Header band: breadcrumb strip, avatar, name + chips (driver type, licence), meta line with an **inline Status dropdown** (same 4 statuses), buttons **Share to chat** · **Print** · **Edit Profile** (opens the application form pre-filled). Tiles: Status · Tenure · CDL / Licence · Terminal. Header condenses on scroll.

| Tab | Purpose |
|---|---|
| Overview | Summary, compliance health, recent items. |
| Profile | The application data in read mode (personal, address, licences, experience, employment…). |
| Monitoring | The driver's monitored dates (licence, medical, training…) – list only. |
| Activity | Actions taken on the driver's monitored items. |
| Records | Compliance records / documents filed for the driver. |
| Consent Forms | Signed consents from hiring/onboarding. |
| Training | Assigned and completed training. |
| Hours of Service | HOS violations and logs. |
| Inspections | Roadside inspections where this driver was inspected. |
| Violations | Violations on the driver's record. |
| Accidents | Accidents linked to the driver. |
| Tickets | Tickets / citations issued to the driver. |
| Inventory | Items issued to the driver (hand-overs). |

---

## 6. Roles and visibility

Access is set in **Users & Roles ▸ Roles**; the default table for the Account menu:

| Role | Access | What differs |
|---|---|---|
| Super Admin | Full | Sees every carrier; the top-bar **Switch carrier** picks which one. |
| Admin (service profile) | Full | Only carriers under their service profile. |
| Fleet Admin | Full | Only the carrier(s) they are assigned to. |
| Safety Manager | **Light (view only)** | Blue "View only" strip under the top bar. **TO CONFIRM:** the edit/add/delete buttons are still rendered and clickable in light mode (observed in the test run) – decide whether light should disable them. |
| User | **Light (view only)** | Same as Safety Manager. |
| Driver | Hidden | Menu not shown; the route falls back to the driver's own pages. |

A user whose role has no carrier assigned sees the "No carrier profile yet" page.

---

## 7. Shared behaviours

- **Toasts** (bottom-right, green, auto-dismiss): "Changes saved successfully", "Cargo Types updated successfully", "Office Location added/updated successfully", "Director added/updated successfully", "Location removed successfully", "<driver> is now <status>", "Driver added/updated successfully", "n drivers imported successfully", "n travel documents filed to compliance — …", asset status change confirmation.
- **Delete confirmation:** every ⋮ Delete uses the browser `confirm()` with the text `Delete <noun> <name>? This cannot be undone.` (assets, drivers, yard locations). Office locations under Fleet Overview delete without confirmation.
- **Share to chat** opens the same dialog on asset rows, driver rows, yard locations, the asset page and the driver page.
- **Disabled states:** pagination arrows at the ends; wizard primary buttons disabled until the schema passes; Add Driver's driver-type picker disabled while editing an existing driver.
- **Keyboard:** tab strips are buttons; yard-location rows are focusable (`Enter` opens).

---

## 8. Not in the UI (left out on purpose)

- `CarrierProfilePage.tsx` still contains code for **Compliance (Key Numbers)** and **Documents (Carrier Documents)** tabs, but they are not in the tab list and cannot be reached. Their live replacements are the **Compliances & Documents** and **DQ Files** menus. TO CONFIRM: delete the dead code.
- `/account/locations` renders the same Locations page standalone (with breadcrumb); no menu links to it.

---

## 9. TO CONFIRM (open questions)

1. Should **light (view-only)** roles have the edit/add/delete controls disabled, not just the banner?
2. Yard Terminals **Security** filter: options are score bands, code matches feature names – which is intended?
3. **Export** buttons on Assets and Drivers – intended behaviour (CSV of the visible rows?).
4. DOT **LOOKUP** and VIN **LOOKUP** – real SAFER / VIN decode, or demo?
5. **State of Inc.** and address **State** selects show 4–5 states – full list wanted?
6. Removing a corporate office location has no confirmation – wanted?
7. Which Add Driver fields must block **Save Driver**?
8. Drivers **Import**: provide a downloadable template?
9. No **delete** for a director – intended?
10. Dead Compliance / Documents tab code in CarrierProfilePage – remove?
