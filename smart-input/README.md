# Overview
Smart Input is a fast path that converts folders of HTML into a canonical model, then generates Salla themes.

# Structure
- `input/` — drop source folders here
- `processing/` — temporary working area
- `canonical/` — canonical JSON, assets copy, `qa-summary.json`

# Commands
- Parse once: `npm run smart-parse <folder>`
- Batch: `npm run smart-batch` (use `--clean --days 7` for cleanup)
- Watch: `npm run smart-watch`
- Status: `node src/cli/smart-cli.cjs status-folder <folder>`

# Links
- Quickstart: [`docs/SMART-INPUT-QUICKSTART.md`](../docs/SMART-INPUT-QUICKSTART.md)
- Docs index: [`docs/INDEX.md`](../docs/INDEX.md)
