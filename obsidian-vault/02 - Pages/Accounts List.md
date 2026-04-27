---
name: Accounts List
description: List of carrier accounts with selection
type: page
tags: [page, accounts]
---

# Accounts List

**Route:** `/accounts`
**File:** `src/pages/accounts/AccountsListPage.tsx`
**Data:** `src/pages/accounts/accounts.data.ts`

## Purpose

Lists all carrier accounts. User can select one (sets `selectedAccount` in `App.tsx`) or navigate to [[Add Account]].

## Props

- `onNavigate(path)` — change active route
- `onSelectAccount(account)` — set the active account

## Related

- [[Add Account]]
- [[Carrier Profile]]
- [[compliance.utils]]
