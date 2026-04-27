# Obsidian Vault — TrackSmart Dashboard

This folder is an **Obsidian vault** that acts as the second brain for the TrackSmart Dashboard project. It contains no code — only notes, indexes, specs, and templates that describe the codebase one level up.

## How to open

1. Install Obsidian → https://obsidian.md
2. `File → Open Vault → Open folder as vault`
3. Select this `obsidian-vault/` folder.
4. Open `00 - Home/Home.md` to start.

## Structure

```
00 - Home/                — Landing page (Home.md)
01 - Project Overview/    — Project summary, tech stack, architecture
02 - Pages/               — One note per UI route
03 - Data Layer/          — Mock data, AppDataContext, types
04 - Components/          — Layout, UI primitives
05 - Features & Specs/    — Feature specs, PDF extraction, etc.
06 - Tasks/               — Active, Backlog, Done
07 - Daily Notes/         — Daily work log
08 - Decisions & ADRs/    — Decision records
09 - References/          — External docs and useful links
templates/                — Daily Note, Page Spec, Decision, Task
```

## Conventions

- Wiki-links: `[[Note Title]]` — Obsidian default, file extension omitted.
- Frontmatter on every note: `name`, `description`, `type`, `tags`.
- Daily notes live in `07 - Daily Notes/` named `YYYY-MM-DD.md`.
- New ADRs are numbered: `ADR-001-<slug>.md`, indexed in `08 - Decisions & ADRs/Decisions Index.md`.

## Plugins

Core plugins enabled by default: file explorer, search, switcher, graph, backlinks, daily notes, templates, command palette, outline, bookmarks, properties, canvas. No community plugins required.

## Note for Git

The vault sits inside the project folder for convenience. If you don't want it tracked, add `obsidian-vault/` to `.gitignore`. If you do want it tracked, you may want to ignore Obsidian's per-machine workspace state by adding:

```
obsidian-vault/.obsidian/workspace.json
obsidian-vault/.obsidian/workspace-mobile.json
obsidian-vault/.obsidian/cache
```

to `.gitignore`.
