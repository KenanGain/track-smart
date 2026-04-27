---
name: Components Index
description: Map of shared components in src/components
type: index
tags: [components, index]
---

# Components Index

## Layout — `src/components/layout/`

- `AppSidebar.tsx` — primary nav, consumes [[Sidebar Data]]
- (other shells / headers as added)

## UI primitives — `src/components/ui/`

Reusable atomic primitives (buttons, cards, dialogs, inputs, tables). Composed with `class-variance-authority` + `tailwind-merge`. See [[UI Components]] for inventory.

## Feature components

- `src/components/key-numbers/` — Key Numbers feature
- `src/components/locations/` — Locations feature
- `src/components/settings/` — Settings sub-components

## Pages with co-located components

Some pages own their own component files (rather than `src/components/`):

- `src/pages/accounts/DriverComponents.tsx`, `DriverForm.tsx`, `DriverProfileView.tsx`
- `src/pages/settings/KeyNumberEditor.tsx`, `TrainingEditModal.tsx`

## Pattern

Generic / reusable → `src/components/ui/`
Feature-scoped reusable → `src/components/<feature>/`
Page-only one-off → keep co-located in `src/pages/<area>/`

## Related

- [[Architecture]]
- [[Pages Index]]
