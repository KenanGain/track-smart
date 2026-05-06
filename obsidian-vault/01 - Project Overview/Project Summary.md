---
name: Project Summary
description: High-level overview of the TrackSmart Dashboard project
type: overview
tags: [overview, project]
---

# Project Summary

**Name:** TrackSmart Dashboard (package: `tracksmart-dashboard`)
**Type:** Front-end SPA + a single Resend-backed serverless email endpoint
**Domain:** Fleet management, DOT/CVOR/NSC compliance, safety analysis for trucking carriers
**Status:** Working prototype — mock-data driven, almost feature-complete on the front end. PDF report generators for inspections (FMCSA / CVOR / NSC) are currently in flight (uncommitted).

## What it does

TrackSmart is a multi-page operations dashboard for trucking fleet operators. It centralizes:

- **Carrier Profile** — entity info, MC/DOT numbers, authority status
- **Accounts** — multi-account support (list, add, switch active)
- **Inventory** — assets and drivers across the fleet
- **Compliance** — documents, permits, expiration tracking
- **Safety** — events, analysis (CVOR-style), inspections, violations, accidents
- **Operations** — fuel, hours of service, paystubs, tickets
- **Settings** — key numbers, document types, expense types, training, maintenance

## Audience

Carrier operators, safety managers, and dispatchers who need a single pane to monitor compliance and operational health.

## Current scope

- Front-end React 19 app with simulated state.
- All app data lives in `src/data/*.data.ts` and per-feature `pages/<area>/*.data.ts` (mock data).
- One real backend route: `POST /api/send-vendor-email` (Resend). Served locally by the Vite plugin in `src/server/devApi.ts`; in production by Vercel's serverless functions convention.
- Navigation is handled by a state-driven sidebar (no router yet — `react-router-dom` is installed but unused; see [[Architecture]]).
- Persistence is mostly in-memory; two `localStorage` keys cross sessions (see [[Database and Storage]]).

## Related

- [[Tech Stack]]
- [[Architecture]]
- [[Frontend]] · [[Backend]] · [[API Routes]] · [[Database and Storage]]
- [[Pages Index]]
- [[Data Index]]
- [[Current Features]]
