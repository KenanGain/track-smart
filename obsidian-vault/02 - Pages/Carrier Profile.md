---
name: Carrier Profile
description: Carrier entity profile page — MC/DOT, authority, identifiers
type: page
tags: [page, profile]
---

# Carrier Profile

**Route:** `/account/profile`
**File:** `src/pages/profile/CarrierProfilePage.tsx`
**Data:** `src/pages/profile/carrier-profile.data.ts`
**Spec doc:** `docs/Carrier_Profile_Page.md`

## Purpose

Displays and edits the carrier's master entity record — legal name, MC/DOT/USDOT numbers, authority status, addresses, contacts.

## Notes

- Re-renders per selected account: `App.tsx` passes `key={selectedAccount?.id}` so switching accounts remounts the page.
- Uncommitted edits are present (currently modified file per `git status`).

## TODO / Open

- [ ] Document the field schema once stable
- [ ] Link compliance state from here (driver/vehicle counts)

## Related

- [[Accounts List]]
- [[Frontend Data Reference]]
- [[Compliance Documents]]
