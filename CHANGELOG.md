# Changelog

All notable changes to TrackSmart Dashboard.

## 2026-05-06 — Documentation and Obsidian Vault Update

### Added
- `PROJECT_CONTEXT.md` — project context dossier for engineers and AI agents (current state, business logic, must-not-break features, risk areas, unknowns).
- `AGENT_PROMPT.md` — drop-in prompt for AI agents continuing the project.
- `SKILLS.md` — agent rules covering development, documentation, design, Obsidian-vault, and never-do guardrails.
- `DESIGN.md` — design system reference (theme tokens, typography, layout patterns, component patterns, missing/TBD items).
- `TODO.md` — prioritized task list.
- `PROJECT_DOCS_OBSIDIAN_UPDATE_AGENT_PROMPT.md` — preserved source of the documentation/Obsidian update prompt.
- New Obsidian notes under `obsidian-vault/01 - Project Overview/` and `obsidian-vault/06 - Tasks/` covering: Frontend, Backend, API Routes, Database & Storage, Environment Variables, Setup & Run Guide, Input/Output Flow, Known Issues, Next Steps, Agent Instructions, Vault Changelog.
- New `obsidian-vault/04 - Components/Design System.md`.
- New `obsidian-vault/05 - Features & Specs/Current Features.md`.
- New `obsidian-vault/00 - Home/Project Dashboard.md` (vault landing dashboard with index of all numbered topics).

### Updated
- `README.md` — replaced the default Vite-template README with a real project README (stack, scripts, env, folders, features, backend, storage, known issues, doc map).
- `obsidian-vault/00 - Home/Home.md` — refreshed quick links to point to the new dashboard and topic notes.
- `obsidian-vault/01 - Project Overview/Project Summary.md` — note current state including the serverless email endpoint and the in-progress PDF report generators.
- `obsidian-vault/01 - Project Overview/Architecture.md` — added the `api/` + `src/server/devApi.ts` pieces and the vendor-portal short-circuit.
- `obsidian-vault/01 - Project Overview/Tech Stack.md` — added `resend`, `jspdf`, `html2canvas`.
- `obsidian-vault/02 - Pages/Pages Index.md` — added Service Profile, Admin, Profile, Vendor Portal, plus the missing inventory/maintenance/compliance entries.
- `obsidian-vault/02 - Pages/Inspections.md` — expanded with PDF report files and jurisdictional component map.
- `obsidian-vault/06 - Tasks/Active Tasks.md` — refreshed to reflect the current uncommitted state (PDF generators, service-types, asset modals).

### Notes
- No source code was changed.
- Only documentation files, prompt files, and Obsidian vault notes were created or updated.
- The existing Obsidian vault structure (`00 - Home/`, `01 - Project Overview/`, `02 - Pages/`, etc.) was preserved; required topics from the prompt were added under the matching existing folders rather than creating a duplicate vault.
