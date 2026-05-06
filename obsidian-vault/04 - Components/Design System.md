---
title: Design System
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - design
  - components
  - documentation
---

# Design System

> Vault mirror of the root `DESIGN.md`. Prefer keeping the canonical text in the root file and using this note as a navigation hub from the vault.

## See first

- Root reference: `DESIGN.md` (full theme, typography, layout, component-pattern catalog).
- [[Components Index]] — file map of every shared component.
- [[Layout]] — `AppSidebar`, `TopNavbar`, switchers.
- [[UI Components]] — primitives in `src/components/ui/`.

## Quick facts

- **Aesthetic:** dense data-dashboard. Slate + blue, plenty of cards and tables, 13–14 px body.
- **Theme tokens:** HSL CSS variables in `src/index.css` under `:root`. Tailwind utilities reference them via `hsl(var(--<name>))`.
- **Primary color:** blue (`217 91% 60%`).
- **Radius:** `0.5rem` (8 px) — buttons, cards, inputs.
- **Font:** Inter (Google Fonts) with `cv02 cv03 cv04 cv11` font-feature-settings.
- **Icon set:** `lucide-react` only.
- **Charts:** `recharts` only.
- **No dark mode.**

## Primitives in `src/components/ui/`

| File | What it is |
| --- | --- |
| `badge.tsx` | Pill for status/role/jurisdiction tags |
| `button.tsx` | Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon` |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `combobox.tsx` | Searchable select |
| `DataListToolbar.tsx` | Search input + filter pills + actions row above lists |
| `dialog.tsx` | Modal primitive |
| `input.tsx` | Standard text input |
| `label.tsx` | `<Label>` for forms |
| `radio-group.tsx` | Radio inputs |
| `scroll-area.tsx` | Custom scrollable container |
| `select.tsx` | Native-ish select |
| `separator.tsx` | Horizontal/vertical divider |
| `SubTabs.tsx` | Second-level tabs nested inside Tabs |
| `table.tsx` | Table primitive (13 px text) |
| `tabs.tsx` | Top-level tabs |
| `textarea.tsx` | Multiline input |
| `toggle.tsx` | Pressed/unpressed toggle |

## Composition pattern

Each primitive uses `cn()` from `@/lib/utils` to merge Tailwind classes and accept `className` overrides. New primitives should follow `button.tsx`.

## Layout pattern

`src/App.tsx`:

```
<div class="flex h-screen w-full bg-slate-50">
  <AppSidebar />
  <div class="flex-1 flex flex-col min-w-0">
    <TopNavbar />
    <main class="flex-1 overflow-auto">
      {renderPage()}
    </main>
  </div>
</div>
```

Page padding is `p-8`. Inner sections sit on `bg-white rounded-xl border border-slate-200`.

## Missing / Needs Confirmation

- Toast/notification primitive
- Loading skeletons
- Mobile breakpoints
- Dark mode
- Accessibility audit

## Related

- `DESIGN.md` (root, canonical)
- [[Components Index]]
- [[Frontend]]
