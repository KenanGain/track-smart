---
name: Architecture
description: How the app is structured — entry, routing, state, data flow
type: overview
tags: [overview, architecture]
---

# Architecture

## Entry point

- `index.html` → `src/main.tsx` → `<App />`
- `src/App.tsx` is the orchestrator: holds `path` state, renders `<AppSidebar />` + the active page in a flex layout.

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

- Mock data lives in `src/data/*.data.ts` and is consumed directly by pages or via [[AppDataContext]].
- No backend, no fetch layer. Persistence is in-memory only.

## Build

- TS strict (`tsc -b`) before Vite bundling.
- Output to `dist/`.

## Related

- [[Tech Stack]]
- [[Pages Index]]
- [[Data Index]]
- [[Components Index]]
