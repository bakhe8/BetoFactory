# Platform Profiles & Mapping (Overview)

This document outlines how Beto Factory uses platform profiles and mapping rules to reconstruct platform-specific theme output from a single canonical model. As of v2.2.0, adapters emit a unified manifest.json and reconstruction also ensures an index template is present to satisfy basic structure checks.

## Profiles
Profiles live under `config/platforms/` and define general characteristics per platform:
- `engine`: template engine (twig, jinja, liquid, ...)
- `structure`: key folders (templates, sections, assets, config, ...)
- `extensions`: file extensions for templates/styles/scripts
- `helpers`: optional hints for asset URL helpers

Examples:
- `config/platforms/salla.json`
- `config/platforms/zid.json`
- `config/platforms/shopify.json`

## Mapping Rules
Mapping rules live under `config/mapping/` and drive how canonical sections/components become platform files.
- `templateDir`: base directory for templates
- `sectionDir`: target directory for sections
- `extension`: extension for generated templates
- `map`: optional per-section mapping overrides (`hero` → `sections/hero.twig`)

Examples:
- `config/mapping/salla.json`
- `config/mapping/shopify.json`

## Reconstruction Engine
The file reconstruction engine reads canonical JSON and mapping rules, then writes placeholder templates when the adapter runs.
- Source: `core/reconstruct.cjs`
- Method: `reconstruct(platform, canonicalJson, outputDir)`
- Scans `components` keys and `sections[]` entries to discover section names.

## Adapter Integration
- Salla: `adapters/salla/index.cjs` loads the platform profile and runs reconstruction with `platform = 'salla'`.
- Shopify: `adapters/shopify/index.cjs` runs reconstruction with `platform = 'shopify'` and attempts an optional `shopify theme check`.
- Zid: `adapters/zid/index.cjs` scaffolds required structure and writes a manifest.

All adapters should write a unified `manifest.json` with:
- `folder`, `platform`, `timestamp`, `sourceCanonicalPath`
- `sectionsDetected`, `componentsExtracted`, `assetsFound`, `assets[]`

## Adding a New Platform
1) Create a profile under `config/platforms/<name>.json`.
2) Create mapping rules under `config/mapping/<name>.json`.
3) Add adapter entry in `config/adapters.json`.
4) Implement adapter under `adapters/<name>/index.cjs` (see docs/adapters/SDK.md).
5) Wire CLI: `npm run adapt:cli -- adapt --platform <name> --folder <folder>`.
