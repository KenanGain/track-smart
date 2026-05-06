---
title: Agent Instructions
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - agent
  - documentation
---

# Agent Instructions

> Drop-in instructions for AI agents (Claude Code, Cursor, Copilot Workspace, etc.) continuing this project. Pair with the root `AGENT_PROMPT.md` and `SKILLS.md`.

## Read first (always)

1. `README.md` (root)
2. `PROJECT_CONTEXT.md` (root)
3. `SKILLS.md` (root) — strict rules
4. `DESIGN.md` (root)
5. [[Project Dashboard]] (this vault)
6. `git status` and `git log -n 20`

## Inspection checklist

- [ ] `git status` — note in-flight files; do not refactor them without confirming.
- [ ] Open `src/App.tsx` and locate the route you'll touch (`if (path === "/...")`).
- [ ] Read the page's local `*.data.ts` files before touching its state.
- [ ] If the change crosses jurisdictions (FMCSA / CVOR / Alberta / BC / PEI / NS), open the matching `Nsc*` component **and** `inspectionsData.ts` / `nscInspectionsData.ts`.
- [ ] If touching global state, read `src/context/AppDataContext.tsx` end to end.

## Safe workflow

1. State the plan in plain text. Get user agreement if it touches a must-not-break feature (see [[Frontend]] § "Default carrier resolution" and [[Known Issues]]).
2. Make the smallest change that satisfies the requirement.
3. `npm run build`. Then `npm run dev` and walk the affected page in a browser.
4. Update the matching Obsidian note + `CHANGELOG.md` + `TODO.md` if relevant.
5. Report results in the format from `AGENT_PROMPT.md` § "How to report final changes".

## Never

- Never delete or rename a mock-data field without grepping for usage across `src/`.
- Never widen sidebar visibility (drop role filtering).
- Never remove the `app_current_user_id` or `tracksmart_vendor_responses` `localStorage` keys.
- Never move the **vendor-portal short-circuit** out of the first branch in `App()` (`if (isVendorPortalUrl()) return <VendorWorkOrderFormPage />`).
- Never introduce a state-management library, router migration, or backend without explicit user agreement.
- Never commit `.env` or any file containing a real Resend API key.
- Never invent a feature that isn't in `PROJECT_CONTEXT.md` — surface assumptions instead.
- Never delete this vault folder or its `.obsidian/` config.

## Update Obsidian

- Vault root: `obsidian-vault/`. Don't create a duplicate at `docs/obsidian-vault/`.
- Use the existing folder structure (`00 - Home/`, `01 - Project Overview/`, ...).
- Every note needs YAML frontmatter (see [[Vault Changelog]] for the recently added pattern).
- Use `[[Wiki Links]]`. Don't include the `.md` extension.
- Add new ADRs as `08 - Decisions & ADRs/ADR-###-<slug>.md` and link from `Decisions Index.md`.
- Add daily notes via the template in `templates/Daily Note.md`.

## Reporting changes

After completing a task, reply with:

1. **What I changed** — file paths grouped by purpose.
2. **Why** — 1-3 sentences tying back to the user's request.
3. **What I verified** — `npm run build` result; manual UI check (route + role).
4. **What I did *not* do** — in-flight or related work I left untouched, with reasons.
5. **Open questions** — any assumption the user should confirm.
6. **Doc updates** — list of doc/vault files updated.

## Related

- `AGENT_PROMPT.md` (root)
- `SKILLS.md` (root)
- [[Project Dashboard]]
- [[Known Issues]]
- [[Next Steps]]
