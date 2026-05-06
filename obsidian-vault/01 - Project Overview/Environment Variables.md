---
title: Environment Variables
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - environment
  - configuration
  - documentation
---

# Environment Variables

## File locations

- **Template:** `.env.example` — committed.
- **Local:** `.env` (or `.env.local`) — git-ignored. Never commit. `vite.config.ts` reads it via `loadEnv()` and copies values into `process.env` so the dev-API plugin can see them.
- **Production:** Vercel dashboard → Settings → Environment Variables.

## Variables

| Variable | Required? | Used by | Purpose |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Only when sending vendor email | `api/send-vendor-email.ts` | Resend API key. Missing → endpoint returns `500` with a clear message; the rest of the app continues to work. |

That is the **only** environment variable currently needed. The mock data has no DB, no third-party SDK keys, no analytics keys.

## How dev loads env

`vite.config.ts`:

```ts
const env = loadEnv(mode, process.cwd(), '')
for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
}
```

This makes `.env*` values visible to the `devApiPlugin()` so `/api/*.ts` handlers can read `process.env.X` during `npm run dev`.

## How Vite exposes vars to the browser

By default Vite only exposes vars prefixed `VITE_*` to the client. **None are currently used** — the only env var (`RESEND_API_KEY`) is server-only and must stay that way. Don't ever rename it to `VITE_RESEND_API_KEY`; that would leak the secret to the browser bundle.

## Adding a new variable

1. Add a placeholder line to `.env.example`.
2. Add a `.env` entry locally and a Vercel env entry for production.
3. If it's a server secret, **don't** prefix `VITE_`. Read it via `process.env.X` inside `api/*.ts`.
4. If it's a public client value, prefix `VITE_` and read it via `import.meta.env.VITE_X`.
5. Update this note and `README.md`.

## Related

- [[Backend]]
- [[API Routes]]
- [[Setup and Run Guide]]
