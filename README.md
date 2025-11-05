# Beto Factory — Core Edition (Salla Only)

Local theme manufacturing flow that converts raw HTML into a canonical JSON model, adapts it to Salla (Twig), and exports a ready-to-upload ZIP.

## Requirements
- Node.js 18+ (tested on 22.x)
- npm

## Install
```
npm install
```

## Project Commands
- `npm run canonicalize` — Parse `input/index.html` → `canonical/theme.json`
- `npm run adapt:salla` — Generate `build/salla/templates/index.twig` + `theme.json`
- `npm run clean` — Placeholder cleaner step
- `npm run export` — Export `build/beto-theme.zip` (via archiver)
- `npm run build` — Full pipeline: canonicalize → adapt → assets → locales → validate+lint (Salla CLI) → clean → export
- `npm run preview` — Start local preview server at http://localhost:5173
- `npm run watch` — Watch `input/` and auto rebuild (canonicalize → adapt → assets → locales → validate+lint)
- `npm test` — Run all tests (`test:canonical`, `test:adapter`, `test:export`)
- `npm run lint` / `npm run format` — ESLint / Prettier

## Salla CLI Integration
We vendor the Salla CLI for validation, linting, watch, and deployment.

Shortcuts (run from repo root; wrapper runs inside `build/salla`):
- `npm run salla:validate` — `salla theme validate`
- `npm run salla:lint` — `salla theme lint`
- `npm run salla:pre-push` — pre-deployment checks
- `npm run salla:push` — deploy to dev store
- `npm run salla:publish` — publish to marketplace
- `npm run dev` — `salla theme watch` (live development)

## CI
GitHub Actions builds and tests on every push to `main`.

Notes:
- Commands skip gracefully if CLI is unavailable or not authenticated.
- Some operations (push/publish) require Salla account and auth via CLI.

## Typical Workflow
1. Put your source HTML into `input/index.html` (and assets next to it)
2. Build everything:
   ```
   npm run build
   ```
3. Preview locally:
   ```
   npm run preview
   # open http://localhost:5173
   ```
4. Inspect outputs in `build/salla/` and the final ZIP at `build/beto-theme.zip`.

## Preview Server
- Route `/render` renders a simple HTML view from `canonical/theme.json`.
- Route `/input` serves the raw `input/index.html`.
- Route `/salla` shows the generated Twig template.
- If `canonical/theme.json` is missing, preview auto-runs canonicalization.

## Canonical Model
Schema: `schemas/canonical.schema.json`
- Built by `core/canonical.js` using Cheerio.
- Validated in tests with Ajv (2020-12).

## Adapter (Salla)
- `core/adapter-salla.js` generates `index.twig` and `theme.json`.

## Export
- `core/export.js` creates `build/beto-theme.zip` via `archiver`.

## Validation
- `core/validate-salla.js` attempts Salla CLI; skips gracefully if absent.

## Tests
- `tests/test-canonical.js` — JSON Schema validation.
- `tests/test-adapter.js` — Ensures adapter outputs exist.
- `tests/test-export.js` — Ensures the ZIP exists.
