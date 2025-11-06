# Phase 9: Factory Dashboard

## Goals

- Provide a local web UI to manage themes: upload, list, build, and inspect QA/logs.
- Live log streaming for parser/errors and build lifecycle notifications.
- Basic QA visualization per theme (counts, invalid refs) from canonical outputs.

## Current Status

- Dashboard scaffold exists (Vite + React) with:
  - Upload to Input (ZIP → `smart-input/input/<name>`) via `/api/upload-input`.
  - Theme listing via `/api/themes` and build trigger `/api/build/:name`.
  - Socket logs for parser/errors; basic metrics endpoint.
  - QA view placeholders wired to `/api/theme/:name` and `/api/qa/:name`.

## Acceptance Criteria

- Upload ZIP to Input extracts safely and updates list automatically.
- Build triggers show progress and completion; errors surface in UI.
- QA summary panel displays images/styles/scripts counts and invalidRefs for selected theme.
- Logs console tails parser and error logs live.

## TODO

- Add combined dashboard API to fetch QA summary directly from `smart-input/canonical/<name>/qa-summary.json` and render table.
- Add link to open build output folder (`build/salla-themes/<name>`) and download ZIP.
- Add status badges for last build state (success/failed) using `/api/metrics`.
- Optional: theme preview pane (served from build) with static assets.
- Optional: add multi‑platform build toggle (reads `SMART_PLATFORMS`).


## Status
- Upload to Input: ✅ (dashboard UploadBox -> /api/upload-input)
- List & Build Themes: ✅ (with platform selection)
- Live logs + toasts + progress: ✅
- QA summary & report panels: ✅
- Build downloads (ZIP/manifest): ✅

