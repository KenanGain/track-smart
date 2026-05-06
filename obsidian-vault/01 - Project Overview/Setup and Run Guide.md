---
title: Setup and Run Guide
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - setup
  - documentation
---

# Setup and Run Guide

## Prerequisites

- **Node.js** ≥ 20 (Vite 7 requires modern Node).
- **npm** (the repo uses `package-lock.json`).
- **Resend** account if you want to send vendor emails (optional for the rest of the app).

## First-time setup

```sh
git clone <this-repo>
cd "Full prototpye code"
npm install
cp .env.example .env       # then edit .env and set RESEND_API_KEY
```

## Running

### Dev server

```sh
npm run dev
```

- Starts Vite at `http://localhost:5173`.
- The local `devApiPlugin` (`src/server/devApi.ts`) serves `api/*.ts` on `/api/*`.
- Editing `api/*.ts` reloads via `ssrLoadModule` — no restart needed.
- Login via the demo dropdown (it lists `APP_USERS` from `src/data/users.data.ts`). Use `DEMO_PASSWORD` (or check the constant in that file).

### Production build

```sh
npm run build
```

- Runs `tsc -b` (project-wide TypeScript build) then `vite build`.
- Output → `dist/`.
- Always run this before reporting a task done — `tsc -b` catches missing exports the dev server hides.

### Preview the build

```sh
npm run preview
```

Serves `dist/` locally so you can sanity-check the prod bundle.

### Lint

```sh
npm run lint
```

## Smoke test the app

After each change, walk through:

1. **Boot path** — open `http://localhost:5173`, confirm the Login page renders.
2. **Quick login** — pick a super-admin from the dropdown. Sidebar should render the full nav.
3. **Sign out / Sign in as an admin** — confirm sidebar visibility narrows (role filtering).
4. **Carrier switcher** — switch carriers via the top navbar; confirm Carrier Profile updates.
5. **Compliance Documents** (`/compliance`) — confirm the folder tree, document types, and tag sections from `AppDataContext` render.
6. **Inspections** (`/inspections`) — for a carrier with an Ontario CVOR fixture, confirm the CVOR sub-view renders.
7. **Vendor portal flow** — from `Maintenance` → `Create Order`, build a vendor portal URL, open it in a new tab, fill the form, save the response, confirm it lands in `localStorage["tracksmart_vendor_responses"]`.

## Email check (only with `RESEND_API_KEY`)

- `RESEND_API_KEY` must be set.
- Until you verify a custom domain in Resend, the `from:` address is `onboarding@resend.dev` and `to:` is restricted to your Resend account owner's signup email.

## Related

- [[Environment Variables]]
- [[Backend]]
- [[Architecture]]
- [[Known Issues]]
