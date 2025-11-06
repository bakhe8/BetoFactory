# Beto Factory — Core Edition (Salla Only)

[![Test (fast)](https://github.com/bakhe8/BetoFactory/actions/workflows/test-fast.yml/badge.svg)](https://github.com/bakhe8/BetoFactory/actions/workflows/test-fast.yml)

## Docs
- Quickstart: fast-mode setup and commands — `docs/SMART-INPUT-QUICKSTART.md`
- Salla Adapter: canonical → Twig pipeline — `docs/SALLA-ADAPTER-GUIDE.md`
- Build Flow: end-to-end process & outputs — `docs/FACTORY-BUILD-FLOW.md`
- CLI Reference: commands and options — `docs/CLI.md`
- API Overview: parser, validator, adapter — `docs/API.md`
- Partner Guide: friendly setup & troubleshooting — `docs/PARTNER-SETUP.md`



## Build Output

Each theme build includes:
- manifest.json with build metadata and asset counts
- Structure validation warnings for missing essential files

### Manifest Fields
- older: Theme namespace
- 	imestamp: Build timestamp
- sectionsDetected: Number of sections extracted
- componentsExtracted: Number of components identified
- ssetsFound: Total assets processed

 that converts raw HTML into a canonical JSON model, adapts it to Salla (Twig), and exports a ready-to-upload ZIP.

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
- `npm run adapt:platform` — Alias to `adapt:salla` (aligns with docs/roadmap.html)
- `npm run clean` — Placeholder cleaner step
- `npm run export` — Export `build/beto-theme.zip` (via archiver)
- `npm run build` — Full pipeline: canonicalize → adapt → assets → locales → validate+lint (Salla CLI) → clean → export
- `npm run preview` — Start local preview server at http://localhost:5173
- `npm run watch:input` — Smart Input watcher (see below)
- `npm run watch` — Alias to watch:input
- `npm run watch:build` — Rebuild pipeline on input changes (legacy build watcher)
- `npm test` — Run all tests (`test:canonical`, `test:adapter`, `test:export`)
- `npm run lint` / `npm run format` — ESLint / Prettier

Fast Mode (Smart Input):
- `npm run smart-parse <folder>` — Process `smart-input/input/<folder>` end‑to‑end and generate the Salla theme ZIP.
- `npm run smart-watch` — Minimal watcher that processes newly created folders in `smart-input/input`.

## Salla CLI Integration
We vendor the Salla CLI for validation, linting, watch, and deployment.

Shortcuts (run from repo root; wrapper runs inside `build/salla`):
- `npm run salla:validate` — `salla theme validate`
- `npm run salla:lint` — `salla theme lint`
- `npm run salla:pre-push` — pre-deployment checks
- `npm run salla:push` — deploy to dev store
- `npm run salla:publish` — publish to marketplace
- `npm run salla:dev` — `salla theme watch` (live development)

## CI
GitHub Actions builds and tests on every push to `main`.

On tag pushes matching `v*`, CI builds and uploads `build/beto-theme.zip` as an artifact.

## Assets
- Place any additional files under `input/assets/**`; they are copied to `build/salla/assets/**` preserving structure.

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
- Built by `core/input.js` using Cheerio.
- Validated in tests with Ajv.

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
- `tests/manifest-structure.test.cjs` — Verifies manifest.json and soft structure validation behavior.
- `tests/fast-mode-assets.test.cjs` — Validates asset hashing (sha256_16) and sizes in manifest.

## Documentation
- `docs/DEVELOPER_KICKOFF_GUIDE.md` — Project overview and goals
- `docs/roadmap.html` — Roadmap and architecture
- `docs/TWIG_BASICS.md` — Twig basics for Twilight/Salla
- `docs/examples/twig-basic-example.twig` — Twig example snippet

## Docs
- Quickstart (Fast Mode): `docs/SMART-INPUT-QUICKSTART.md`
- Salla Adapter Guide: `docs/SALLA-ADAPTER-GUIDE.md`
- Factory Build Flow: `docs/FACTORY-BUILD-FLOW.md`
- CLI Reference: `docs/CLI.md`
- API Overview: `docs/API.md`
- Partner Setup Guide: `docs/PARTNER-SETUP.md`

## Migration Notes
- Option attributes: templates now use `option.attributes|raw` instead of the previous misspelled `option.attirubtes|raw`.
  - If you pass custom attributes to option components, provide them via `attributes`.
- Option visibility conditions: templates accept `option.condition_attributes|raw` and render them on inputs/selects to support conditional visibility (e.g., `data-visibility-option`, `data-visibility-operator`, `data-visibility-value`).

## Smart Input Folder System
Automates parsing of any design folder dropped into `input/` and produces canonical JSON + copies assets.

- Parser: `tools/parser.cjs`
- Watcher: `tools/folderWatcher.cjs`
- Validator: `tools/schema-validator.js`

### Quick Start
1) Drop a folder under `input/<your-design>/` with `.html` files and assets.
2) Run the parser once:
```
npm run parse
```
3) Or watch for new folders in real time:
```
npm run watch
```
4) Validate the generated canonical files:
```
npm run validate
```

### Expected Output
```
canonical/
  <your-design>/
    *.json        # one per input HTML
    assets/**     # copied assets (if present)
```

### Notes
- The watcher only reacts to new top‑level folders under `input/`.
- Windows glob patterns are handled (forward‑slash normalization).
- Validation uses Ajv with a basic canonical schema.

### Fast Mode (Smart Input)
For rapid iteration, you can use the Smart Input fast path which watches and processes folders under `smart-input/input/` and bridges to the existing Salla adapter automatically.
1) Create a folder: `smart-input/input/my-theme/` and drop `.html` (and optional `assets/`, `images/`).
2) Run once: `npm run smart-parse my-theme` or watch: `npm run smart-watch`.
3) Outputs: canonical JSON in `smart-input/canonical/my-theme/` and namespaced theme at `build/salla-themes/my-theme/` with ZIP `build/salla-themes/my-theme.zip`.


## Roadmap & Milestones

We track all work as labeled issues and epics:

- Milestones
  - M1: Phases 7–8 (Adapters & Consolidation)
  - M2: Phase 9 (Dashboard Integration)
  - M3: Phase 10 (QA Automation)

- Labels
  - phase-[1–10], type:[feature|bug|security|refactor|docs], priority:[P0|P1|P2], status:[todo|done]

- Key Open Issues
  - #5 Unify watcher logic and deprecate legacy (phase-2, P1)
  - #6 Modernize Salla adapter to profile/mapping (phase-8, P0)
  - #7 Complete Shopify OS2.0 structure + validation parsing (phase-8, P0)
  - #8 QA summary + budgets + trends (phase-10, P1)
  - #9 Live per-theme build logs with stdout/stderr (phase-9, P1)
  - #10 Dashboard: File tree, syntax highlighting, and search (phase-9, P2)

See the Issues tab for the full backlog and epics.
