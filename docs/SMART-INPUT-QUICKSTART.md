# Smart Input — Fast Mode Quickstart

This guide walks you through the minimal, working Smart Input flow to turn a plain HTML folder into a generated Salla theme ZIP.

## Prerequisites
- Node.js 18+ (22.x tested)
- Git (optional)

## 5‑Step Setup
1) Initialize directories
```
npm run smart-init
```
2) Create a test theme folder with at least one HTML file
```
mkdir -p smart-input/input/my-theme
# Example (Windows PowerShell):
#   New-Item -ItemType Directory -Force smart-input\input\my-theme
#   Set-Content smart-input\input\my-theme\index.html '<html><body>Hello</body></html>'
```
3) Process the folder into canonical JSON
```
npm run smart-parse my-theme
```
4) Generate the Salla theme
```
npm run smart-parse my-theme
```
5) Verify outputs
```
# Canonical JSON
smart-input/canonical/my-theme/

# Salla namespaced build + ZIP
build/salla-themes/my-theme/
build/salla-themes/my-theme.zip
```

## Commands Cheat Sheet
- Initialize: `npm run smart-init`
- Parse once: `npm run smart-parse <folder>`
- Batch all folders: `npm run smart-batch` (append `--clean --days 7` to cleanup after)
- Watch for new folders: `npm run smart-watch`
- Minimal CLI: `npm run smart -- parse <folder>` or `npm run smart -- watch`
- Status for a folder: `node src/cli/smart-cli.cjs status-folder <folder>`
- All-in-one (batch + cleanup): `npm run smart-all`
- Select canonical for legacy build: `npm run canonical:select -- <folder>`
- Bridge export to namespaced build: `npm run bridge:export -- <folder>`

Note: The watcher monitors both `smart-input/input/` and `input/` for new top-level folders.

## Troubleshooting
- "Folder not found": Ensure your folder exists at `smart-input/input/<folder>`.
- "No HTML found": Add at least one `.html` file (ideally `index.html`) to the folder.
- Windows path issues: Prefer PowerShell and use forward slashes or escaped backslashes.
- Adapter step fails: Re-run parse and inspect `logs/failed/` for details.
- Permission errors: Close any app that may lock files; re-run shell as Administrator if needed.

## Success Criteria
- A user drops a folder into `smart-input/input/`
- Running `npm run smart-parse <folder>` produces canonical JSON
- Namespaced build and ZIP appear under `build/salla-themes/`

> Working > Perfect. Add features later; keep the core flow simple and reliable.
