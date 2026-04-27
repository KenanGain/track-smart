---
name: Sidebar Data
description: Structure and source of the sidebar navigation
type: data
tags: [data, navigation]
---

# Sidebar Data

**File:** `src/data/sidebar.data.ts`
**Consumer:** `src/components/layout/AppSidebar.tsx` → rendered from `App.tsx`

## Purpose

Single source of truth for the left-hand navigation. Each entry carries a label, icon, and `path` value. `App.tsx` matches `path` to a page in its `renderPage()` switch.

## Note

Currently has uncommitted changes (per `git status`). When sidebar items are added/removed, the matching `path` branch in `App.tsx` must also be updated — see [[Architecture]].

## Related

- [[Pages Index]]
