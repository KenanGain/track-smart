# PROJECT DOCUMENTATION + OBSIDIAN VAULT UPDATE PROMPT

You are helping with my current app project, which is almost complete.

Your task is to inspect the existing project, understand what has already been built, and update all project documentation and Obsidian vault files so another AI agent or developer can continue building the app safely.

## Most Important Rule

Do NOT change, edit, refactor, rename, delete, or rewrite any existing source code.

You are only allowed to create or update documentation files, prompt files, skills files, design files, and Obsidian vault notes.

---

## Main Goal

I need complete documentation for the current state of the project.

You must document everything that currently exists, including:

- Current app structure
- Current frontend
- Current backend, if available
- Current API routes
- Current components
- Current pages/screens
- Current database/storage logic, if available
- Current input and output flow
- Current design system
- Current app features
- Current environment variables
- Current commands/scripts
- Known issues
- Missing or incomplete features
- Safe next steps for another AI agent

Do not write fake features.
Do not guess silently.
If something is unclear, mark it as:

```md
Unknown: ...
```

or

```md
Assumption: ...
```

---

## Required Project Files to Create or Update

Create or update these files in the main project folder:

```txt
README.md
PROJECT_CONTEXT.md
AGENT_PROMPT.md
SKILLS.md
DESIGN.md
CHANGELOG.md
TODO.md
```

---

## Required Obsidian Vault Update

Also update the current Obsidian vault files for this project.

First, search for an existing Obsidian vault folder. It may be named:

```txt
obsidian/
Obsidian/
vault/
project-vault/
docs/obsidian-vault/
notes/
```

If an Obsidian vault already exists, update the existing files instead of creating duplicate notes.

If no Obsidian vault exists, create one here:

```txt
docs/obsidian-vault/
```

---

## Required Obsidian Vault Structure

Create or update this structure:

```txt
docs/obsidian-vault/
├── 00 - Project Dashboard.md
├── 01 - Project Overview.md
├── 02 - Architecture.md
├── 03 - Frontend.md
├── 04 - Backend.md
├── 05 - API Routes.md
├── 06 - Database and Storage.md
├── 07 - Design System.md
├── 08 - Current Features.md
├── 09 - Input Output Flow.md
├── 10 - Environment Variables.md
├── 11 - Setup and Run Guide.md
├── 12 - Known Issues.md
├── 13 - Next Steps.md
├── 14 - Agent Instructions.md
├── 15 - Changelog.md
└── attachments/
```

If a section does not apply to the project, still create the file and write:

```md
Not applicable based on the current project files.
```

Do not leave empty files.

---

## Obsidian Markdown Rules

Each Obsidian note must use proper Obsidian markdown.

Add frontmatter to every note:

```md
---
title: File Title
project: Current App Project
type: documentation
status: active
last_updated: YYYY-MM-DD
tags:
  - project
  - documentation
  - app
---
```

Use Obsidian internal links where helpful:

```md
[[00 - Project Dashboard]]
[[01 - Project Overview]]
[[02 - Architecture]]
[[07 - Design System]]
[[14 - Agent Instructions]]
```

Use useful tags:

```md
#project
#frontend
#backend
#api
#design
#agent
#todo
#documentation
```

Use clean headings, tables, checklists, and bullet points.

---

# File Requirements

## 1. README.md

Update the main project README with:

* Project overview
* Current project status
* Tech stack
* Installation steps
* How to run locally
* Environment variables
* Available commands
* Folder structure
* Main features
* API/backend overview
* Frontend overview
* Database/storage overview, if available
* Known issues
* Links to important docs
* Link to Obsidian dashboard

---

## 2. PROJECT_CONTEXT.md

Create a detailed context file for future AI agents.

Include:

* What this project is
* Current state of the project
* What has already been built
* Important files and folders
* Main app flow
* Core business logic
* Current input/output behavior
* Features that must not be broken
* Safe areas for future development
* Risk areas
* Known limitations
* Unknowns and assumptions

---

## 3. AGENT_PROMPT.md

Create a reusable prompt that I can give to another AI agent.

It must explain:

* What the project is
* How to inspect the project
* How to continue development safely
* How to avoid breaking existing code
* How to update documentation
* How to update the Obsidian vault
* How to report final changes

The agent prompt must be strict, clear, and production-ready.

---

## 4. SKILLS.md

Create a project-specific AI agent skills/instructions file.

Include:

* Agent role
* Development rules
* Documentation rules
* Obsidian vault rules
* Design rules
* Testing/checking rules
* Safe workflow
* What the agent must never do

Important rules to include:

```md
- Inspect before editing.
- Do not rewrite working code.
- Do not change source code unless specifically asked.
- Follow the existing project structure.
- Keep documentation updated.
- Update Obsidian notes when project behavior changes.
- Clearly explain all assumptions.
- Preserve current input/output behavior.
```

---

## 5. DESIGN.md

Document the current design system.

Include:

* UI style
* Theme
* Color palette
* Typography
* Layout patterns
* Component patterns
* Cards
* Buttons
* Forms
* Modals
* Tables
* Sidebars
* Navigation
* Responsive behavior
* Current screens/pages
* Screens still needed
* Future design rules

Only document what exists.
If something is missing, write it under "Missing / Needs Confirmation."

---

## 6. CHANGELOG.md

Create or update the changelog.

Use this format:

```md
# Changelog

## YYYY-MM-DD - Documentation and Obsidian Vault Update

### Added
- Added project documentation files.
- Added or updated Obsidian vault documentation.
- Added agent instructions and project context files.

### Updated
- Updated README.md.
- Updated DESIGN.md.
- Updated SKILLS.md.
- Updated project documentation.

### Notes
- No source code was changed.
```

---

## 7. TODO.md

Create a clear project task list.

Use this structure:

```md
# TODO

## High Priority
- [ ] Confirm incomplete features
- [ ] Test full app flow
- [ ] Verify environment variables
- [ ] Review API routes
- [ ] Confirm deployment steps

## Medium Priority
- [ ] Add screenshots to Obsidian vault
- [ ] Add architecture diagram
- [ ] Improve API documentation
- [ ] Document edge cases

## Low Priority
- [ ] Add future feature ideas
- [ ] Clean old notes
- [ ] Improve developer onboarding docs
```

---

# Required Inspection Before Writing

Before updating documentation, inspect:

* Project folder structure
* Package/dependency files
* Frontend pages/components
* Backend routes/controllers/services
* API files
* Database/schema files
* Config files
* Environment examples
* Existing docs
* Existing Obsidian vault
* Existing README
* Existing design notes
* Existing scripts/commands

Then update the documentation based on the real project files.

---

# Final Response Required

After completing the documentation update, give me a final summary with:

1. Files created
2. Files updated
3. Obsidian vault path
4. Main project features discovered
5. Important project structure discovered
6. Unknowns or assumptions
7. Known issues
8. Recommended next steps
9. Confirmation that no source code was changed

---

# Absolute Restrictions

* Do NOT change app source code.
* Do NOT refactor code.
* Do NOT delete files.
* Do NOT rename source files.
* Do NOT install packages.
* Do NOT modify package dependencies.
* Do NOT rewrite the app.
* Do NOT create fake documentation.
* Do NOT ignore existing documentation.
* Do NOT ignore the Obsidian vault.
* Do NOT leave empty documentation files.

Your goal is to fully document the current project and update the Obsidian vault so another AI agent or developer can continue the app from the exact current state safely.
