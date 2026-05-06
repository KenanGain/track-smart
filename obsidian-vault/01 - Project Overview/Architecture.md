---
name: Architecture
description: How the app is structured — entry, routing, state, data flow
type: overview
tags: [overview, architecture]
---

# Architecture

## Entry point

- `index.html` → `src/main.tsx` → `<AppDataProvider>` → `<App />`.
- `src/App.tsx` is the orchestrator: holds `path`, `currentUser`, `selectedAccount`, `selectedServiceProfileId`. Renders `<AppSidebar>` + `<TopNavbar>` + `<main>` running `renderPage()`.

## Vendor-portal short-circuit

`App()` checks `isVendorPortalUrl()` first. If the URL hash starts with `#/vendor/work-order?d=`, it renders `<VendorWorkOrderFormPage />` and skips the entire authenticated shell. This is the only "public" route. Removing or moving this check breaks the vendor link flow.

## Navigation

- **Currently simulated.** `App.tsx` keeps `path` in `useState`. Sidebar calls `onNavigate(path)` to change it. A long `if` chain in `renderPage()` maps each path to a page component.
- `react-router-dom` is installed but not yet wired in. Migration to a real router is a likely future task — see [[Decisions Index]].

## Folder layout

```
src/
  App.tsx                — root orchestrator (path state, page switch)
  main.tsx               — React entry
  index.css              — Tailwind base
  components/
    layout/              — AppSidebar, headers, shells
    ui/                  — primitives (Button, Card, Dialog, etc.)
    key-numbers/         — Key Numbers feature components
    locations/           — Location feature components
    settings/            — Settings sub-components
  context/
    AppDataContext.tsx   — global state provider (see [[AppDataContext]])
  data/                  — all mock data + type defs (see [[Data Index]])
  pages/                 — one folder per major area (see [[Pages Index]])
  lib/                   — small utilities
  types/                 — shared TS types
  utils/                 — helpers
```

## State

- Mock data lives in `src/data/*.data.ts` and `src/pages/<area>/*.data.ts`, consumed directly by pages or via [[AppDataContext]].
- No fetch layer. Persistence is in-memory + two `localStorage` keys (`app_current_user_id`, `tracksmart_vendor_responses`) — see [[Database and Storage]].

## Backend surface

- `api/send-vendor-email.ts` — `POST` endpoint that sends a vendor work-order email through Resend.
- `api/_emailTemplate.ts` — shared HTML renderer (underscore prefix means *not* an endpoint).
- `src/server/devApi.ts` — Vite plugin that serves `/api/*.ts` files in dev. In production, Vercel auto-deploys them.
- See [[API Routes]] · [[Backend]] · [[Environment Variables]].

## Build

- TS strict (`tsc -b`) before Vite bundling.
- `nodePolyfills({ include: ['buffer','stream','process','events','util'] })` shims Node globals for browser bundles.
- Output to `dist/`.

## Related

- [[Tech Stack]]
- [[Frontend]] · [[Backend]] · [[API Routes]] · [[Database and Storage]]
- [[Pages Index]]
- [[Data Index]]
- [[Components Index]]
- [[Setup and Run Guide]]
