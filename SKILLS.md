# SKILLS — Agent Rules for TrackSmart Dashboard

> Project-specific skills/instructions file. Pair with `AGENT_PROMPT.md` and `PROJECT_CONTEXT.md`.

---

## Agent role

A senior front-end engineer continuing development of a React 19 + TypeScript + Vite SPA prototype with one Resend-backed serverless email endpoint. The agent must preserve existing behavior, follow the existing patterns, and keep the documentation and Obsidian vault in sync with the code.

## Core principles

- **Inspect before editing.** Read the target file and its mock-data neighbors first. `git status` first to see in-flight work.
- **Match the existing pattern.** This codebase uses functional React, Tailwind, prop-drilling for page state, and `AppDataContext` for global slices. Don't bring in new patterns without consent.
- **Preserve current input/output behavior.** The vendor portal hash payload, login + `localStorage`, sidebar role filtering, and default-carrier resolution are load-bearing.
- **Document as you go.** Update root docs (`CHANGELOG.md`, `TODO.md`, sometimes `README.md`/`PROJECT_CONTEXT.md`) and the Obsidian vault notes in the matching section.
- **Surface assumptions.** When something is unclear, mark it `Assumption: ...` or `Unknown: ...` in the doc rather than silently guessing.

## Development rules

- **Inspect before editing.** Always read the file. For pages, also read `*.data.ts` next to it.
- **Do not rewrite working code.** Make the smallest change that fulfills the requirement.
- **Do not change source code unless specifically asked.** If the user asks for documentation, write only docs.
- **Follow the existing project structure.** New pages → `src/pages/<area>/`. New primitives → `src/components/ui/`. New global state → `AppDataContext.tsx` (resist this — split first).
- **Run `npm run build` before declaring done.** `tsc -b` catches missing exports the dev server hides.
- **Grep before removing state or fields.** Vite build doesn't type-check JSX expressions exhaustively; ReferenceErrors surface only at runtime as blank pages.
- **Verify UI changes in the browser.** Open `npm run dev`, walk the golden path **and** at least one alternate role (super-admin vs admin).
- **Keep changes scoped.** Don't bundle a refactor into a bug fix. Don't add features the requirement doesn't require.
- **Comments only when the *why* is non-obvious.** No "what" comments. No "added for issue #X" comments.

## Documentation rules

- **`CHANGELOG.md`** — add an entry under today's date for any user-visible change. Use the existing `### Added / ### Updated / ### Notes` format.
- **`TODO.md`** — keep the priority buckets accurate. Move completed items out (don't strikethrough; delete).
- **`README.md`** — update only when scripts, env vars, dependencies, top-level features, or stack change.
- **`PROJECT_CONTEXT.md`** — update only when a load-bearing fact changes (routing strategy, persistence, auth model, business rule, must-not-break invariant).
- **`DESIGN.md`** — update when a new design primitive is introduced or a design rule changes.

## Obsidian vault rules

- Vault path: `obsidian-vault/` (not `docs/obsidian-vault/`). Don't duplicate.
- **Use the existing folder structure** (`00 - Home/`, `01 - Project Overview/`, `02 - Pages/`, ...). Don't introduce a new numbering scheme.
- Every note must have YAML frontmatter:
  ```yaml
  ---
  name: <Note Title>
  description: <one-line, used by graph + search>
  type: <overview|page|data|component|feature|task|decision|index|reference>
  tags: [<tag1>, <tag2>, ...]
  ---
  ```
- Use `[[Wiki Links]]` for cross-references — Obsidian's default, no file extension.
- New page note → place in `02 - Pages/` and link from `02 - Pages/Pages Index.md`.
- New ADR → `08 - Decisions & ADRs/ADR-###-<slug>.md`, indexed in `Decisions Index.md`.
- Daily notes go in `07 - Daily Notes/YYYY-MM-DD.md` using `templates/Daily Note.md`.

## Design rules

(See `DESIGN.md` for the full reference.)

- Tailwind CSS 4 with the HSL theme variables in `src/index.css`. Don't introduce another color system.
- Use `cn()` from `@/lib/utils` to compose Tailwind classes — don't inline ternaries that produce class strings.
- Follow the variant pattern in `src/components/ui/button.tsx` for new primitives.
- Inter font is global; don't add other fonts without justification.
- Charts use `recharts`. Don't add a second charting library.
- Icons are `lucide-react`. Don't mix icon sets.

## Testing / checking rules

- There is no test framework wired up. If you add tests, prefer Vitest (Vite-native) and place them next to source as `*.test.ts(x)`.
- Always run `npm run build` before reporting done.
- For UI: open `npm run dev`, walk the change manually, watch DevTools console. Type checks ≠ feature checks.
- For email: do not send live emails when `RESEND_API_KEY` is unset; the endpoint already returns 500 in that case.

## Safe workflow

1. `git status` — note in-flight work.
2. Read `PROJECT_CONTEXT.md` and the target file.
3. Plan in plain text first. Confirm with the user if the plan touches a must-not-break feature.
4. Implement the smallest change that satisfies the requirement.
5. `npm run build` and (if UI) `npm run dev` + manual walkthrough.
6. Update `CHANGELOG.md` + matching Obsidian note.
7. Report results in the format from `AGENT_PROMPT.md` § "How to report final changes".

## What the agent must NEVER do

- Never delete or rename a mock-data field without grepping for usage across `src/`.
- Never widen sidebar visibility (drop role filtering).
- Never remove the `app_current_user_id` or `tracksmart_vendor_responses` `localStorage` keys.
- Never move the **vendor-portal short-circuit** out of the first branch in `App()`.
- Never introduce a state-management library, router migration, or backend without explicit user agreement.
- Never commit `.env` or any file containing a real Resend API key.
- Never run `git reset --hard`, `git push --force`, `git clean -f`, or any destructive op without explicit user instruction.
- Never skip ESLint or `tsc -b` (don't pass `--no-verify` or similar bypasses).
- Never invent a feature that isn't in `PROJECT_CONTEXT.md` — flag it as an assumption instead.
- Never delete the Obsidian vault folder or its `.obsidian/` config.
