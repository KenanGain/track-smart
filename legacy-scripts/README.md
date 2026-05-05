# legacy-scripts/

One-off Python and Node scripts collected from the project root. **None of these are used by the live web app** (the React/Vite TrackSmart dashboard under `src/`). They are kept here for history and occasional reference.

## What's here

```
legacy-scripts/
├── python/
│   ├── cvor/           ← CVOR-specific transforms / chart generators / fix passes (18 files)
│   ├── transforms/     ← generic transformN.py iterations from prototype work (6 files)
│   └── fixes/          ← misc one-off fix/find/replace/print/gen utilities (13 files)
├── node-fixes/         ← .js / .mjs / .cjs one-off fixers (encoding, NSC bars, PDF gen, etc.) (10 files)
├── stray-tsx/          ← SafetyAnalysisPage.tsx that lived at the project root before being properly placed in src/pages/safety-analysis/
└── logs/               ← compile_errors.txt, diff.txt, output.txt, ts_errors.txt, report_matches.txt, replacement.txt, git_history_nsc.txt, vite_error.log
```

## What's NOT in here (and why)

These stay at the project root because they're load-bearing for the web app or for documented build/dev flows:

| Path | Why kept |
|---|---|
| `src/`, `public/`, `dist/` | App source / public assets / build output |
| `index.html` | Vite entry |
| `package.json`, `package-lock.json` | npm config |
| `tsconfig*.json` | TypeScript config (referenced by `tsc -b` and Vite) |
| `vite.config.ts` | Vite config |
| `eslint.config.js`, `tailwind.config.js`, `postcss.config.js` | Tool configs imported by their tooling at run/build time |
| `node_modules/`, `test-results/` | Tool managed |
| `scripts/` | Project's own active scripts folder (CVOR helper utilities still in use) |
| `docs/`, `obsidian-vault/` | Documentation |

## Verifying the move was safe

After this reorganisation:
```bash
npm run build
```
…still completes successfully (`✓ 2670 modules transformed`). No `src/` file references any of the relocated scripts; `package.json` only runs `vite`, `tsc`, `eslint`. The grep matches earlier for `cvor_` etc. in `src/data/violations.data.ts` were string literals (mock-data IDs like `"cvor_26vzirxhq"`), not module imports.

## If you want to find or use one again

Each subfolder is flat — `ls legacy-scripts/python/cvor/` to see the file list. Filenames preserve their original names so any `git log -- <oldpath>` history pre-move and `git log -- <newpath>` post-move are easy to follow.
