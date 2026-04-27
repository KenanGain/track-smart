---
name: UI Components
description: Reusable UI primitives in src/components/ui
type: components
tags: [components, ui]
---

# UI Components

**Folder:** `src/components/ui/`

## Conventions

- Each primitive is a single file, named PascalCase (`Button.tsx`, `Card.tsx`, etc.).
- Variants composed via `class-variance-authority` (`cva`) and merged with `tailwind-merge`.
- Most accept a `className` prop and forward refs.

## TODO

- [ ] List every primitive here with a one-line purpose once stable.
- [ ] Document common variant names (size, intent, tone).

## Related

- [[Components Index]]
