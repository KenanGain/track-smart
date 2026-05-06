---
title: API Routes
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - api
  - backend
  - documentation
---

# API Routes

> The complete list of HTTP routes the project exposes. Today it's exactly one — the vendor work-order email endpoint.

## Inventory

| Method | Path | File | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/send-vendor-email` | `api/send-vendor-email.ts` | Send a vendor work-order email via Resend |

That's the entire HTTP surface. No GET endpoints, no auth endpoints, no data endpoints.

## Hidden helpers (NOT routes)

| File | Why |
| --- | --- |
| `api/_emailTemplate.ts` | Shared HTML renderer; underscore prefix prevents the dev plugin (and Vercel) from exposing it |

## Local routing

In `npm run dev`, requests to `/api/*` are intercepted by `src/server/devApi.ts` (Vite plugin). The plugin:

- Resolves `route` to one of `api/<route>.ts`, `.js`, `<route>/index.ts`, `<route>/index.js`.
- Refuses any underscore-prefixed segment.
- `ssrLoadModule`s the file (auto-reloads on edit) and invokes its `default` export.
- Provides a `res.status().json()` shim that mirrors Vercel's response API.

## Production routing

**Assumption:** Vercel auto-deploys `api/*.ts` as serverless functions. No `vercel.json` is committed; the platform's default file-based convention is relied on.

## Adding a new route

1. Create `api/<name>.ts`. Export a default async function `handler(req, res)`.
2. Use the same response shim contract: `res.status(code).json(data)`.
3. Handle method-not-allowed (`405`) and missing-body (`400`) explicitly.
4. Read env via `process.env.X` and return `500` with a helpful message if a required var is missing.
5. Underscore-prefix any helper files (e.g. `_renderFoo.ts`) so they don't become endpoints.
6. Document the route here and in `README.md`.

## Related

- [[Backend]]
- [[Environment Variables]]
- [[Vendor Portal]] (in [[Current Features]])
