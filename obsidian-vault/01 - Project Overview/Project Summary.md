---
name: Project Summary
description: High-level overview of the TrackSmart Dashboard project
type: overview
tags: [overview, project]
---

# Project Summary

**Name:** TrackSmart Dashboard (package: `tracksmart-dashboard`)
**Type:** Front-end prototype / SPA
**Domain:** Fleet management, DOT compliance, safety analysis for trucking carriers
**Status:** Prototype — front-end only, mock data driven

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

- Front-end React app with simulated state (no backend yet).
- All data lives in `src/data/*.data.ts` files (mock data).
- Navigation is handled by a state-driven sidebar (no router yet, see [[Architecture]]).

## Related

- [[Tech Stack]]
- [[Architecture]]
- [[Pages Index]]
- [[Data Index]]
