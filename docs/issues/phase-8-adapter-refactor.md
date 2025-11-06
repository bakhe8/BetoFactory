# Phase 8: Adapter Refactor (Multi‑Platform)

## Goals

- Centralize adapter invocation via `AdapterManager` for multi‑platform builds.
- Support `SMART_PLATFORMS` env (comma‑separated) to generate multiple outputs per build.
- Keep Salla as default when unspecified.

## Current Status

- `core/adapter-manager.cjs` provides registry‑based `generate()` and `generateAll()`.
- `tools/smart-parser.cjs` now calls `_generateThemes(...)` using `AdapterManager` and honors `SMART_PLATFORMS`.
- Rename logic maintained for Salla outputs to avoid collisions.

## Acceptance Criteria

- Running `node src/cli/factory-build.cjs <folder>` produces builds for all platforms in `SMART_PLATFORMS`.
- Default run still builds Salla only.
- Adapter failures for one platform do not break others; errors recorded and surfaced.

## Follow‑ups

- Expand reconstruction for non‑Salla targets.
- Expose `adapter-cli` in npm scripts for direct `adapt` / `adapt-all` usage.
- Add tests covering multi‑platform generation and manifest presence.

## TODO (Defer to later)

- Implement reconstruction mappings for Zid/Shopify output structures to remove template warnings.
- Add multi‑platform stability runs (extend `tools/stability-runner.cjs` to iterate `SMART_PLATFORMS`).
- Unify manifest schema across platforms and include platform field.
- Wire CI job to exercise `SMART_PLATFORMS=salla,zid` on a sample canonical folder.
- Document adapter contribution guide and platform‑specific caveats.

## Status
- AdapterManager wired into build: ✅
- Multi‑platform via SMART_PLATFORMS: ✅
- Unified manifest across platforms (adds platform field): ✅
- Per‑platform progress UI in dashboard: ✅

