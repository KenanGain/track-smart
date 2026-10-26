# Inventory walkthrough — caption / voice-over script

**File:** `inventory-walkthrough.mp4` · 1920×1080 · H.264 · 03:21 long · no audio track (captions are burned into the picture; the lines below double as a voice-over script).

Recorded 2026-10-23 against the running app on the carrier Acme Logistics: the Super Admin test account (Kenan Gain) for the office side and the driver test account (Jason Cooper) for the driver side. Nothing is masked: every name, address, email and phone number is fictional demo data and is shown exactly as the app shows it. The on-screen caption bar shows exactly the text below from the time given.

| Time | Section | Caption / voice-over |
|---|---|---|
| 00:00 | Intro | Inventory — walkthrough (test accounts, fictional demo data) |
| 00:06 | List | Sidebar › Inventory: every card, transponder, ELD, key, PPE item and device the carrier owns. Four tabs: List, Drivers, Assets, Vendors. |
| 00:11 | List | Five figures at the top — total, active, expiring soon, expired and unassigned. |
| 00:15 | List | The category rail narrows the list; the chips split it into Assigned and Available. |
| 00:18 | List | Group by Status puts what has expired first. |
| 00:23 | Item page | A row opens the item: what it is, the unit and driver it is on, and the vendor contact. |
| 00:28 | Item page | Monitoring — what the alert counts down to, the reminders, and the next date. |
| 00:33 | Item page | Activity — the item's trail, newest first. |
| 00:40 | Assign dialog | Row ⋮ › Change assignment: put it on a unit, on a driver, or on both — only what the item is ticked for is offered. |
| 00:47 | Add item | Add Inventory — vendor, category, name, status, and whether it goes with the driver, the asset, or both. |
| 00:52 | Add item | Number, PIN, dates, and an optional alert: what to count from, the reminders, the channels. |
| 00:57 | Add item | Save returns to the List with the new item first. |
| 01:01 | Categories | Categories — the twelve kinds of item; one in use cannot be deleted. |
| 01:07 | Drivers | Drivers — the same inventory per person. The tiles filter: holding inventory, holding nothing, expiring, expired. |
| 01:16 | Driver holder page | A driver's own page: Overview, Inventory, Monitoring, Activity. |
| 01:20 | Driver holder page | Inventory — what Jason Cooper holds, with how each item is held and when it runs out. |
| 01:26 | Manage inventory | Manage inventory — one list: what he holds is ticked, what is free can be given out. |
| 01:31 | Manage inventory | Tick two items to give out and untick one to take back — the bar counts the changes and the messages. |
| 01:36 | Manage inventory | Driver Notification — the collect and hand-back messages are drafted, with the receipt he will sign. |
| 01:44 | Manage inventory | Confirm — what goes on, what comes off, and who gets told. |
| 01:55 | Messages (office) | In Messages the office sees the cards it sent, waiting for the driver. |
| 02:02 | Driver side | Signed in as the driver: the same cards are live. |
| 02:13 | Driver side | Sign & confirm opens the receipt, filled in from what he ticked. |
| 02:16 | Driver side | He signs — a copy is filed on his record. |
| 02:21 | Driver side | The card settles: signed, filed, every item confirmed. |
| 02:26 | Driver side | And the key he was asked to return is handed back. |
| 02:38 | Assets | Assets — inventory per unit, split into what the driver returns and what comes off with the vehicle. |
| 02:45 | Assets | A unit carrying an expired ELD — the red pill says so. |
| 02:52 | Vendors | Vendors — the shops and suppliers the carrier buys from, with search, status tiles and grouping. |
| 02:58 | Vendors | A vendor's profile: spend, bills, work orders, the inventory they issued, and how to reach them. |
| 03:12 | Vendors | Add Vendor — name, contact and address. Only the name is required. |
| 03:16 | Outro | End of the Inventory walkthrough. |

## What the video shows, in order

1. **Sign in** with the Super Admin test account and open **Inventory** from the sidebar.
2. **List** — the five figures; the *Keys & Access* category and the *Available* chip; *Group by Status*.
3. **Item page** — open *Comdata — Fuel Card*: Information, Monitoring, Activity.
4. **Assign dialog** — row ⋮ › *Change assignment* (unit + driver blocks); cancel.
5. **Add item** — the wizard; fill Number, Issue and Expiry dates; switch the alert on; *Save Inventory* → the List.
6. **Categories** — the *Item Category* modal; *Done*.
7. **Drivers** — the KPI tiles as filters; open **Jason Cooper**'s holder page and its Inventory tab.
8. **Manage inventory** — tick two spare items, untick *Truck Keys*; *Driver Notification* (collect + hand-back drafts, receipt to sign); *Save & send* → *Confirm these changes* → *Save and send*.
9. **Messages (office)** — the two cards waiting for the driver.
10. **Driver side** — signed in as Jason Cooper: the live card, *Sign & confirm* → the receipt, draw the signature, sign; the card settles; *I have handed these back*.
11. **Assets** — the per-unit view; *ACM-T0102* with its expired ELD.
12. **Vendors** — the list; **Wilmington Truck Service**'s profile and Repair bills; *Add Vendor*; cancel.

## Re-recording

The recording is scripted (`record-inventory.mjs` in the documentation tooling): rerun it after a UI change and regenerate this file from `script.json`. The recorder reports `offsetMs` — the time between the start of the recording and the first caption — and the conversion trims it so the times above are video times:
`ffmpeg -ss <offsetMs/1000> -i inventory-walkthrough.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 -vf scale=1920:1080 -an inventory-walkthrough.mp4`.
