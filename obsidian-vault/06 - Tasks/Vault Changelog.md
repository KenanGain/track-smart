---
title: Vault Changelog
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - changelog
  - documentation
---

# Vault Changelog

> Changes to **this Obsidian vault** and to project documentation. For codebase changes, see the root `CHANGELOG.md`.

## 2026-05-06 — Documentation and Obsidian Vault Update

### Added
- `00 - Home/Project Dashboard.md` — single-page index of all numbered topics required by the prompt.
- `01 - Project Overview/Frontend.md`, `Backend.md`, `API Routes.md`, `Database and Storage.md`, `Environment Variables.md`, `Setup and Run Guide.md`, `Input Output Flow.md`.
- `04 - Components/Design System.md` — design system reference (mirrors root `DESIGN.md`).
- `05 - Features & Specs/Current Features.md` — full feature inventory.
- `06 - Tasks/Known Issues.md`, `Next Steps.md`, this `Vault Changelog.md`.
- `00 - Home/Agent Instructions.md` — drop-in instructions for new AI agents.
- `attachments/` — empty folder for screenshots and diagrams.

### Updated
- `00 - Home/Home.md` — added quick links to the new dashboard and topic notes.
- `01 - Project Overview/Project Summary.md` — noted the serverless email endpoint and the in-progress PDF report generators.
- `01 - Project Overview/Architecture.md` — added the `api/` + `src/server/devApi.ts` pieces and the vendor-portal short-circuit.
- `01 - Project Overview/Tech Stack.md` — added `resend`, `jspdf`, `html2canvas`.
- `02 - Pages/Pages Index.md` — added Service Profile, Admin, Profile, Vendor Portal entries plus the missing inventory/maintenance routes.
- `02 - Pages/Inspections.md` — expanded with PDF report files and the jurisdictional component map.
- `06 - Tasks/Active Tasks.md` — refreshed to reflect the current uncommitted state.

### Notes
- No source code was changed.
- The existing vault structure was preserved. The prompt-required numbered topic files were added inside the matching existing folders rather than creating a duplicate flat hierarchy.
