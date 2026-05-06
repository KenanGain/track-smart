# DESIGN — TrackSmart Dashboard

> Design system reference. Documents what currently exists in `src/index.css`, `src/components/ui/`, and the page-level patterns. Anything not yet built is in **Missing / Needs Confirmation** at the bottom.

---

## UI style

- **Aesthetic:** dense data-dashboard. Slate palette, blue primary, plenty of cards and tables, subtle borders (`border-slate-200`), small text (13–14 px body).
- **Density:** compact — `font-size: 14px` body, `13px` for labels and tables. Headings step down quickly (h1=20, h2=16, h3/h4=14).
- **Tone:** business / fleet ops. Minimal animation. No gradients except in the vendor email banner.

## Theme

CSS variables live in `src/index.css` under `:root`. Tailwind utilities reference them via `hsl(var(--<name>))`.

| Token | HSL | Notes |
| --- | --- | --- |
| `--background` | `0 0% 100%` | App background (white) |
| `--foreground` | `222.2 84% 4.9%` | Slate 900 |
| `--card` / `--popover` | `0 0% 100%` | White surface |
| `--primary` | `217 91% 60%` | Blue (`blue-500`-ish) |
| `--primary-foreground` | `0 0% 100%` | White |
| `--secondary` / `--muted` / `--accent` | `210 40% 96.1%` | Slate 100 |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | Slate 800 |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Slate 500 |
| `--destructive` | `0 84.2% 60.2%` | Red 500 |
| `--destructive-foreground` | `210 40% 98%` | White-ish |
| `--border` / `--input` | `214.3 31.8% 91.4%` | Slate 200 |
| `--ring` | `217 91% 60%` | Same as primary |
| `--radius` | `0.5rem` | 8px — used by buttons, cards, inputs |

There is no dark theme. Don't introduce one without an explicit feature request.

## Color palette (Tailwind direct usage)

In addition to the theme variables, pages frequently use raw Tailwind palette names:

- **Slate** — neutrals: `slate-50/100/200/300/400/500/600/700/900`
- **Blue** — primary actions, links: `blue-50/100/500/600/700`
- **Emerald** — success / valid: `emerald-50/500/600`
- **Amber** — warnings / fleet remarks: `amber-50/200/700/800`
- **Red** — destructive / OOS / critical: `red-50/500/600`
- **Indigo / Violet / Fuchsia** — user-avatar gradients (`from-violet-500 to-violet-700`, etc.)

## Typography

- **Family:** Inter, loaded from Google Fonts in `index.html`. Fallback: system sans.
- **Hierarchy** (`src/index.css`):
  - `h1 / .h1` — 20 px, weight 600, letter-spacing -0.02em
  - `h2 / .h2` — 16 px, weight 500, letter-spacing -0.01em
  - `h3 / h4` — 14 px, weight 500
  - body — 14 px, weight 400
  - `label / .label` — 13 px, weight 400
  - `table / .table` — 13 px
  - `strong / b` — weight 500 (toned down from default 700)

Don't add new font sizes or weights without justification.

## Layout patterns

- **Shell** (`src/App.tsx`):
  - `<div class="flex h-screen w-full bg-slate-50">`
  - Left: `<AppSidebar>` (fixed width, scrollable nav)
  - Right column: `flex-1 flex flex-col min-w-0`
    - `<TopNavbar>` — header strip with breadcrumbs, carrier switcher, user menu
    - `<main class="flex-1 overflow-auto">` — page content
- **Page padding:** `p-8` is the standard outer padding. Inner sections sit on `bg-white rounded-xl border border-slate-200`.
- **Empty states:** centered card (`bg-white rounded-xl border border-slate-200 p-12 text-center`) with a circular icon background (`bg-slate-100 rounded-full`).
- **Vendor portal** is the one route that breaks the shell — full-screen public layout.

## Component patterns

### Cards

`src/components/ui/card.tsx` — composable: `<Card>`, `<CardHeader>`, `<CardTitle>` (large semibold), `<CardDescription>` (slate-500), `<CardContent>`, `<CardFooter>`. Default styling: `rounded-lg border border-slate-200 bg-white shadow-sm`.

### Buttons

`src/components/ui/button.tsx` — variants: `default | destructive | outline | secondary | ghost | link`. Sizes: `default | sm | lg | icon`. Uses `cn()` to compose. Add new variants here, not inline.

### Forms

- **Inputs:** `src/components/ui/input.tsx` — `h-10 rounded-md border-slate-200 bg-white px-3 py-2 text-sm`. Focus ring is slate-950 (note: this is darker than the primary blue).
- **Labels:** `<Label>` from `src/components/ui/label.tsx` (13 px, weight 400 from index.css).
- **Textarea:** `src/components/ui/textarea.tsx`.
- **Select / Combobox:** `src/components/ui/select.tsx`, `combobox.tsx`.
- **Radio:** `src/components/ui/radio-group.tsx`.
- **Toggle:** `src/components/ui/toggle.tsx`.
- **Validation:** `react-hook-form` + `zod` via `@hookform/resolvers`. Inline errors below the field.

### Modals

- **Primitive:** `src/components/ui/dialog.tsx`.
- **Examples in use:** `KeyNumberModal`, `ComplianceConfigureModal`, `LocationEditorModal`, `LocationViewModal`, `CarrierEditModal`, `CarrierViewModal`, `ServiceProfileEditModal`, `ServiceProfileViewModal`, `UserEditModal`, `UserViewModal`, `ChangePasswordModal`, `EditProfileModal`, `AddOfficeModal`, `AddExpenseModal`, `CreateOrderModal`, `AssetModal`, `AssignCarriersModal`, `VendorCategoriesModal`.
- Pattern: portal-mounted, dimmed backdrop, header with title + close (X), padded body, footer with secondary + primary actions.

### Tables

- **Primitive:** `src/components/ui/table.tsx`.
- 13 px text. Sticky headers in scrolling tables. Row hover `hover:bg-slate-50`.
- Toolbar pattern: `src/components/ui/DataListToolbar.tsx` — search input + filter pills + actions on the right.

### Tabs

- **Tabs:** `src/components/ui/tabs.tsx` — top-level navigation within a page (e.g. Accounts, Carrier Profile sub-tabs).
- **SubTabs:** `src/components/ui/SubTabs.tsx` — second-level tabs nested inside a tab.

### Sidebar

- **`AppSidebar`** (`src/components/layout/AppSidebar.tsx`) — driven by `SIDEBAR_NODES[]` in `src/data/sidebar.data.ts`. Each node: `{ key, label, icon, path?, children?, roles? }`. Collapsible groups; active item highlighted by current path.

### Navigation header

- **`TopNavbar`** — breadcrumb on left (derived from path), `CarrierSwitcher` middle/right, user menu on far right. The `CarrierSwitcher` only renders for users with `>1` accessible carriers.

### Charts

- **`recharts`** for everything — bar (BASIC scores, OOS), line (trend over time), pie (distribution).
- Color order should follow theme: blue primary, emerald success, amber warning, red destructive.

### Badges

- **`src/components/ui/badge.tsx`** — small pill, used for role tags, statuses, jurisdictions.

## Responsive behavior

- The shell assumes a desktop viewport. There's no formal mobile breakpoint strategy.
- Pages should not horizontally overflow; tables overflow inside their container with `overflow-auto`.
- **Assumption:** the product is desktop-first, mobile is out of scope for the prototype.

## Current screens / pages

See `obsidian-vault/02 - Pages/Pages Index.md` for the full list. Coverage:

- Dashboard (placeholder)
- Account: Carrier Profile, Locations
- Accounts: List/Tabs, Add, Carrier modals, Service Profile modals
- Service: Service Profile, Empty Service Profile, Add Office
- Admin: Users list, Add user, User modals, access pickers
- Inventory: List, Vendors, Add item, Add vendor, Asset list (drivers), Vendor categories
- Compliance: Documents
- Maintenance: Asset Directory, Asset Maintenance, Asset modal/detail, Create order, Create schedule
- Inspections: list + jurisdictional sub-views (FMCSA, CVOR, Alberta NSC, BC NSC, PEI NSC, NS NSC) + PDF reports
- Violations: list, edit form, settings catalog
- Incidents (`/accidents`)
- Safety: Events, Analysis (with SMS engine + Excel export), Settings
- Hours of Service
- Fuel: page + IFTA summary + settings
- Paystubs, Tickets
- Settings: General, Key Numbers, Document Types, Document Folders, Maintenance, Expense Types, Violations, Inspections, Trainings, Safety, Fuel
- Profile: My Profile, Driver profile views/forms
- Auth: Login (quick-login dropdown grouped by service profile)
- Vendor portal (public): Work Order form

## Future design rules

- New primitives go in `src/components/ui/` and follow the `button.tsx` `cn() + variant + size` pattern.
- Don't introduce a second icon set, font, or chart library.
- New colors should be added as theme tokens before being used in components.
- If a true mobile experience is needed, plan responsive breakpoints before adding any mobile-only utilities.

## Missing / Needs Confirmation

- **Dark mode** — not implemented. Confirm if needed.
- **Mobile breakpoints** — not formally defined. Confirm scope.
- **Toast / notification component** — no `sonner`/`toaster` found; success/error feedback is currently inline. Confirm preferred pattern.
- **Loading skeletons** — no shared `<Skeleton>` primitive in `ui/`. Pages handle loading ad-hoc (or not at all, since data is sync mock).
- **Accessibility audit** — focus rings exist, but a full audit (ARIA labels on icon-only buttons, color contrast, keyboard traversal) hasn't been done.
- **Print stylesheet** — PDF reports are generated via `html2canvas` + `jspdf`, so a separate `@media print` block isn't needed currently.
- **Dashboard page** — the `/dashboard` route is a "coming soon" placeholder. Design and content are TBD.
