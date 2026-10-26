# Tickets walkthrough — caption / voice-over script

**File:** `tickets-walkthrough.mp4` · 1920×1080 · H.264 · 02:11 long · no audio track (captions are burned into the picture; the lines below double as a voice-over script).

Recorded 2026-10-23 against the running app on the carrier Acme Trucking Inc. with the Super Admin test account (Kenan Gain). One demo ticket (OFF-84729) was filled in through the app's own ticket store before recording so the detail page has documents, a trailer and two charges (see screenshots/index.md). Nothing is masked: every name, address, email and phone number is fictional demo data and is shown exactly as the app shows it. The on-screen caption bar shows exactly the text below from the time given.

| Time | Section | Caption / voice-over |
|---|---|---|
| 00:00 | Intro | Tickets — walkthrough (test accounts, fictional demo data) |
| 00:10 | List | Sidebar › Tickets: the carrier's ledger of driver tickets — paper and electronic citations. |
| 00:16 | List | Six figures: total, outstanding fines, open offenses, in court, paid this month, eTickets. |
| 00:21 | List | Category tabs group tickets by violation family; the sub-category cards follow the tab. |
| 00:27 | Missing references | The banner cross-checks regulator references against the tickets on file. |
| 00:30 | Missing references | Each missing reference can be logged as a ticket — one at a time, or in bulk. |
| 00:36 | Filters and row actions | Search and filter by date, status, type, document and regulator source. |
| 00:42 | Filters and row actions | The status pill on each row changes the status in place; ⋮ opens, edits, shares or deletes. |
| 00:48 | Ticket detail | A ticket opens as its own page: status, fine with legal expense, due date and final date — both monitored. |
| 00:52 | Ticket detail | Overview: driver, power unit and trailer, where and when, every charge on the ticket, identifiers, court details, money and dates. |
| 01:02 | Ticket detail | Documents: the citation, the summons — each with its number, date and files. |
| 01:07 | Review | Review: verify the record, then close it with a resolution. |
| 01:13 | Review | A warning letter goes to the driver through Messages — in-app, by secure link or by email. |
| 01:18 | Review | Sent — the review closes and the letter is filed on the driver's compliance record. |
| 01:24 | Review | Activity: the ticket's history with every review step. |
| 01:29 | Edit form | Edit Ticket: one form in six sections — driver & vehicles, identifiers, location, violation & fine, dates, documents. |
| 01:46 | Edit form | Cancel — or Save Ticket — returns to the list. |
| 01:54 | Add form | Add Ticket: pick the driver — licence and unit fill in from the fleet record. |
| 01:59 | Add form | Charges: tap the common ones or search the SMS / CVOR / NSC code list — a ticket can carry several. |
| 02:03 | Add form | Fine plus legal expense gives the total; the due and final dates carry their own reminders. |
| 02:08 | Outro | End of the Tickets walkthrough. |

## What the video shows, in order

1. **Sign in** with the Super Admin test account and open **Tickets** from the sidebar.
2. **List** — the six KPI cards; the *Unsafe Driving* and *Hours-of-Service* category tabs.
3. **Missing references** — *Show missing*, the references with no ticket on file; *Hide missing*.
4. **Filters and row actions** — Status *In Court*; search *OFF-84729*; the row ⋮ menu.
5. **Ticket detail** — OFF-84729: the tiles, the Overview cards, the Documents tab.
6. **Review** — *Mark as verified*, *Issue warning letter*, *Send & close review*, *Done*; the Activity tab.
7. **Edit form** — *Edit Ticket*, scroll through the six sections, *Cancel*.
8. **Add form** — *Add Ticket*, pick Jason Cooper, tick *Speeding* and *Following Too Closely*, fine 250 + legal 150, *Cancel*.

## Re-recording

The recording is scripted (`record-tickets.mjs` in the documentation tooling): rerun it after a UI change and regenerate this file from `script.json`. The recorder reports `offsetMs` — the time between the start of the recording and the first caption — and the conversion trims it so the times above are video times:
`ffmpeg -ss <offsetMs/1000> -i tickets-walkthrough.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 -vf scale=1920:1080 -an tickets-walkthrough.mp4`.
