---
name: Tech Stack
description: Languages, frameworks, and tooling used in TrackSmart Dashboard
type: overview
tags: [overview, stack]
---

# Tech Stack

## Runtime / Framework

- **React 19** (`react`, `react-dom`)
- **TypeScript ~5.9**
- **Vite 7** (dev server + build)
- **react-router-dom 7** (installed but currently navigation is simulated via `useState`)

## UI / Styling

- **Tailwind CSS 4** (with `@tailwindcss/postcss`)
- **lucide-react** — icon set
- **class-variance-authority + tailwind-merge + clsx** — class composition utilities
- **recharts** — charts (used in Safety Analysis / dashboards)

## Forms & Validation

- **react-hook-form 7**
- **zod 4** + **@hookform/resolvers**

## Data / Files

- **xlsx** + **xlsx-js-style** — spreadsheet import/export
- **vite-plugin-node-polyfills** — for browser Node-shim needs

## Tooling

- **eslint 9** + **typescript-eslint** + **eslint-plugin-react-hooks** + **eslint-plugin-react-refresh**
- **postcss + autoprefixer**

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — eslint
- `npm run preview` — preview production build

## See also

- [[Architecture]]
- `package.json` in repo root
