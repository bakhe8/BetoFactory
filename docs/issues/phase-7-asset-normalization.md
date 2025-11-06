# Phase 7: Asset Normalization & QA Expansion

## Goals

- Normalize asset references inside CSS/HTML to canonical paths.
- Expand QA summary to include image/style/script counts (and normalized asset counts).
- Add `factory:build` wrapper (parse → validate → build → zip). ✅ Implemented
- Begin early adapter registry structure for Zid/Shopify (scaffold only).

## Context

- Parser now outputs per-folder canonical under `canonical/<folder>/theme.json` and `meta.json` with metadata and JSON-LD normalization.
- Initial asset path normalization has been added (forward slashes, remove leading `./`, compact slashes), but deeper rewrite inside CSS/HTML is pending.
- `factory:build` CLI wrapper is available as `npm run factory:build [folder]` and processes one or all theme folders.

## Acceptance Criteria

- CSS `url(...)` and HTML `<img/src>`, `<link/href>`, `<script/src>` that point to local assets are rewritten to normalized canonical/build paths.
- `qa-summary.json` includes: `imagesCount`, `stylesCount`, `scriptsCount`, and `assetsFound` for each folder; counts reflect normalized lists.
- Adapter registry scaffold exists (e.g., `config/adapters.json`) to prepare for Zid/Shopify mapping.

## Implementation Notes

- Enhance `tools/smart-parser.cjs > enhanceParsing()` to rewrite relative paths against detected asset roots.
- Consider generating a mapping manifest during copy (canonical) and reusing it during adapter processing.
- Ensure schema validation still passes after path rewrite.

## Follow-ups

- Integrate advanced watcher queue/backoff.
- Add tests covering asset normalization and QA summary fields.

