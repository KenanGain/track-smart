---
title: Project Dashboard
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - dashboard
  - documentation
  - app
---

# Project Dashboard

> One-page index of every documentation topic in this vault. The numbering matches the prompt-required topics; the actual files live under the existing `00 - Home/`, `01 - Project Overview/`, `04 - Components/`, `05 - Features & Specs/`, and `06 - Tasks/` folders so the existing vault structure is preserved.

## Topics

| # | Topic | Note |
| --- | --- | --- |
| 00 | Project Dashboard (this file) | [[Project Dashboard]] |
| 01 | Project Overview | [[Project Summary]] |
| 02 | Architecture | [[Architecture]] |
| 03 | Frontend | [[Frontend]] |
| 04 | Backend | [[Backend]] |
| 05 | API Routes | [[API Routes]] |
| 06 | Database and Storage | [[Database and Storage]] |
| 07 | Design System | [[Design System]] |
| 08 | Current Features | [[Current Features]] |
| 09 | Input Output Flow | [[Input Output Flow]] |
| 10 | Environment Variables | [[Environment Variables]] |
| 11 | Setup and Run Guide | [[Setup and Run Guide]] |
| 12 | Known Issues | [[Known Issues]] |
| 13 | Next Steps | [[Next Steps]] |
| 14 | Agent Instructions | [[Agent Instructions]] |
| 15 | Changelog | [[Vault Changelog]] |

## Existing vault navigation

| Section | Purpose |
| --- | --- |
| [[Home]] | Existing landing page (links + tips) |
| [[Pages Index]] | Map of every UI route to a page note |
| [[Data Index]] | Map of mock-data files |
| [[Components Index]] | Map of components |
| [[Active Tasks]] · [[Backlog]] · [[Done]] | Task status |
| [[Decisions Index]] | ADRs |
| [[Useful Links]] · [[External Docs]] | References |

## Quick orientation

- **Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4. Single Resend serverless endpoint. No DB. See [[Tech Stack]].
- **Routing:** simulated via `useState` in `src/App.tsx`. `react-router-dom` 7 is installed but unused. See [[Architecture]].
- **State:** in-memory React state + [[AppDataContext]] + a small amount of `localStorage`. See [[Database and Storage]].
- **Auth:** mock — login picks a user from `APP_USERS`, identity stored in `localStorage`. See [[Frontend]].
- **In-flight work:** PDF report generators in `src/pages/inspections/`. See [[Inspections]] and [[Active Tasks]].

## Tags used in this vault

#project #frontend #backend #api #design #agent #todo #documentation #data #compliance #safety #inspections #vendor-portal
