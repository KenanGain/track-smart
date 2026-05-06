---
title: Backend
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - backend
  - api
  - documentation
---

# Backend

> The backend surface area is intentionally tiny. There is no traditional server, no database, no auth service, and no fetch layer. One Resend-backed serverless function is the only "real" backend in the repo.

## Surface area

| Piece | File | Purpose |
| --- | --- | --- |
| Vendor email endpoint | `api/send-vendor-email.ts` | `POST` — sends a vendor work-order email via Resend |
| Email template | `api/_emailTemplate.ts` | Shared HTML renderer for the email |
| Dev shim | `src/server/devApi.ts` | Vite plugin — exposes `/api/*.ts` files during `npm run dev` |
| Vite wiring | `vite.config.ts` | Loads env into `process.env`, registers `devApiPlugin()`, polyfills `Buffer`/`process`/etc. for the browser |

There is **no** other backend. No database connection, no ORM, no `/api/auth`, no `/api/data`. All app data is client-side mock state.

## Endpoint contract

`POST /api/send-vendor-email`

Body shape (TypeScript-defined in `api/send-vendor-email.ts`):

```ts
interface VendorEmailRequest {
  to: string;
  workOrderNumber: string;
  portalUrl: string;
  carrier?: { legalName; dbaName?; dotNumber?; city?; state? };
  vendor: { name; companyName?; contactName? };
  createDate: string;
  dueDate?: string;
  notes?: string;
  requirements: { odometerRequired; odometerUnit: 'miles' | 'km'; engineHoursRequired };
  tasks: Array<{
    unitNumber; year?; make?; model?; vin?;
    services: Array<{ name; group }>;
  }>;
  senderName?: string;
}
```

Response: `{ ok: boolean; id?: string; error?: string }`.

Status codes:

- `200` — Resend accepted the email; `id` is the Resend message id.
- `400` — missing required fields.
- `405` — non-POST.
- `500` — `RESEND_API_KEY` not set, or unknown error.
- `502` — Resend returned an error.

## Sender behavior

- Reads `RESEND_API_KEY` from `process.env` (loaded from `.env` in dev via `vite.config.ts`).
- Sender name reflects the carrier when present: `"<Carrier DBA or Legal Name> via TrackSmart <onboarding@resend.dev>"`. Otherwise `"TrackSmart Fleet"`.
- Subject: `"Work Order #<n> — Action Required"`.
- Body: HTML rendered by `api/_emailTemplate.ts` (inline styles only — Gmail/Outlook strip `<style>`).

## Dev plugin (`src/server/devApi.ts`)

- Watches `api/` for `*.ts` / `*.js` and serves them as middleware on `/api/*`.
- Underscore-prefixed files (`api/_*.ts`) are blocked from being exposed (they're shared helpers).
- Provides a tiny `res.status().json()` shim that mirrors the subset of the Vercel response API the handler uses.
- Reloads on every request via `ssrLoadModule`, so editing `api/*.ts` doesn't require a restart.

## Deployment

**Assumption:** the project deploys to **Vercel**. Evidence:
- `api/*.ts` shape matches Vercel's serverless functions convention.
- The dev-API plugin's comments explicitly mention Vercel.

**Unknown:** no `vercel.json` is committed yet, so the Vercel project linkage is implicit.

## Hard rules

- Never expose underscore-prefixed `api/_*.ts` as an endpoint. The dev plugin enforces this; production should match.
- Never crash on missing env. The endpoint already returns `500` with a useful message when `RESEND_API_KEY` is unset.
- Never log the API key.

## Related

- [[API Routes]]
- [[Environment Variables]]
- [[Architecture]]
- [[Vendor Portal]] section in [[Current Features]]
