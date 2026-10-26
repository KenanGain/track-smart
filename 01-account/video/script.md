# Account walkthrough — caption / voice-over script

**File:** `account-walkthrough.mp4` · 1920×1080 · H.264 · 03:22 long · no audio track (captions are burned into the picture; the lines below double as a voice-over script).

Recorded 2026-10-23 against the running app with the Super Admin test account. Nothing is masked: every name, address, email and phone number is fictional demo data and is shown exactly as the app shows it. The on-screen caption bar shows exactly the text below at the time given.

| Time | Section | Caption / voice-over |
|---|---|---|
| 00:00 | Intro | Account · Carrier Fleet Profile — walkthrough (test account, personal data masked) |
| 00:06 | Opening Account | Sidebar › Account opens the carrier's fleet profile. Four sections: Fleet Overview, Yard Terminals, Assets, Drivers. |
| 00:08 | Fleet Overview | Fleet Overview — legal identity, USDOT / CVOR / NSC numbers, operating authority and the carrier risk score. |
| 00:12 | Fleet Overview | Legal / Main and Mailing addresses, fleet counts, cargo carried — each card has its own pencil. |
| 00:16 | Fleet Overview | Corporate office locations and Directors & Officers, with Add / Edit / Remove. |
| 00:20 | Fleet Overview | Edit Corporate Identity — DOT lookup, safety registration, legal / DBA name, business type, status. Cancel keeps the record as it was. |
| 00:26 | Fleet Overview | Add Office Location — label, full address, contact person, phone, operating hours. |
| 00:31 | Fleet Overview | Director Details — contact information, role & compliance. Edit opens the Edit Director form. |
| 00:34 | Fleet Overview | Edit Director — full name, role, email, phone, stock class, ownership %, dates, responsibility. |
| 00:41 | Yard Terminals | Yard Terminals — every yard with its security features (fenced, gated, CCTV, guard, restricted) and a score. |
| 00:45 | Yard Terminals | Search and the Status / Security filters narrow the list. |
| 00:48 | Yard Terminals | Clicking a row opens the location: score, address, time zone and features. |
| 00:52 | Yard Terminals | Add New Location — name, ID, address, time zone, initial status and the five security toggles. |
| 00:57 | Yard Terminals | Row ⋮ menu: Open, Edit, Share to chat, Delete (asks to confirm). |
| 01:01 | Assets | Assets — the fleet register. KPI tiles filter the list; sub-tabs split trucks and trailers. |
| 01:05 | Assets | A tile with no matching units shows the empty state. Total Assets clears the filter. |
| 01:10 | Assets | Status is changed inline, in the row — no edit form needed. |
| 01:14 | Assets | Row ⋮ menu: Open asset, Edit asset, Share to chat, Delete asset. |
| 01:17 | Assets | Share to chat — send the unit and its documents in-app, by external chat or by email. |
| 01:22 | Add Asset wizard | Add Asset — a nine-section wizard: class, vehicle info, plate & monitoring, yard, drivers, annual safety, ownership, insurance, notes. |
| 01:27 | Add Asset wizard | Registration & plate carries its own monitoring block: basis, recurrence, reminders, channels. |
| 01:31 | Add Asset wizard | Ownership & financial files the bill of sale as a document on the unit. |
| 01:35 | Add Asset wizard | Insurance & status — pink slip, operational status, fleet and insurance dates, odometer. |
| 01:39 | Add Asset wizard | Required fields block saving and show inline errors. |
| 01:47 | Asset detail page | Asset detail — header tiles (odometer, risk, health, plate expiry), metadata and eleven tabs. |
| 01:52 | Asset detail page | Monitoring — every date this unit can miss, with priority, due date and who is notified. |
| 01:56 | Asset detail page | Compliances — the unit's records and documents. |
| 02:00 | Asset detail page | Maintenance — intervals, work orders and service history. |
| 02:04 | Asset detail page | Inventory — items issued to the unit. |
| 02:09 | Asset detail page | Scrolling down folds the header; scrolling up brings it back. |
| 02:16 | Drivers | Drivers — the roster. KPI tiles, search, status filter, column picker, Export, Import, Add Driver. |
| 02:20 | Drivers | Filters leave a chip above the table; clear it to return to everyone. |
| 02:22 | Drivers | Driver status changes inline too — Active, On Leave (break), Inactive, Terminated. |
| 02:26 | Drivers | Row ⋮ menu: Open driver, Edit driver, Share to chat, Open DQ file, Delete driver. |
| 02:29 | Drivers | Import — a CSV / XLSX with the accepted columns creates drivers in bulk. |
| 02:34 | Add Driver form | Add Driver — the same application form as hiring, on one page: pick the driver type, then fifteen sections. |
| 02:39 | Add Driver form | License Details — uploads, searchable class, endorsements, restrictions; repeatable per licence. |
| 02:44 | Add Driver form | Hours of Service — the last 8 (US) or 14 (Canada / cross-border) days before the hire date. |
| 02:48 | Add Driver form | Signature & Declarations closes the form; Save Driver files it and its travel documents. |
| 02:55 | Driver profile page | Driver profile — status, Share to chat, Print, Edit Profile; tiles for status, tenure, licence, terminal; thirteen tabs. |
| 03:00 | Driver profile page | Profile — the application data in read mode, with a jump-to-section rail. |
| 03:04 | Driver profile page | Monitoring — the driver's monitored dates. |
| 03:08 | Driver profile page | Records — compliance documents filed for the driver. |
| 03:12 | Driver profile page | Training — assigned and completed courses. |
| 03:17 | Driver profile page | Share to chat works the same here: the driver's file, in-app or by email. |
| 03:19 | Outro | End of the Account walkthrough. |

## What the video shows, in order

1. **Sign in** with a test account and open **Account** from the sidebar.
2. **Fleet Overview** — scroll the identity, authority, address, fleet, cargo, office and director cards; open *Edit Corporate Identity*, *Add Office Location*, *Director Details* and *Edit Director*; cancel each.
3. **Yard Terminals** — search, open a location, open *Add New Location*, open the row ⋮ menu.
4. **Assets** — filter with a KPI tile and clear it, switch the Trucks sub-tab, change a status inline (and back), open the row ⋮ menu and *Share to chat*; walk the **Add Asset** wizard (plate & monitoring, ownership, insurance, validation errors) and discard; open an **asset detail** page and its Monitoring, Compliances, Maintenance and Inventory tabs; fold the header by scrolling.
5. **Drivers** — status filter and chip, inline status change (and back), row ⋮ menu, *Import* modal; walk the **Add Driver** form (License Details, Hours of Service, Signature) and cancel; open a **driver profile** and its Profile, Monitoring, Records and Training tabs; *Share to chat*.

## Re-recording

The recording is scripted (`record-account.mjs` in the documentation tooling): rerun it after a UI change and regenerate this file from `script.json`. Convert with
`ffmpeg -i account-walkthrough.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 -vf scale=1920:1080 account-walkthrough.mp4`.
