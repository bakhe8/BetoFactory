# Smart Input — Fast Mode Quickstart

This guide walks you through the minimal, working Smart Input flow to turn a plain HTML folder into a generated Salla theme ZIP.

## Prerequisites
- Node.js 18+ (22.x tested)
- Git (optional)

## 5‑Step Setup
1) Initialize directories
`
npm run smart-init
`
2) Create a test theme folder with at least one HTML file
`
mkdir -p smart-input/input/my-theme
# Add your HTML file(s)
# Example (Windows PowerShell):
#   New-Item -ItemType Directory -Force smart-input\input\my-theme
#   Set-Content smart-input\input\my-theme\index.html '<html><body>Hello</body></html>'
`
3) Process the folder into canonical JSON
`
npm run smart-parse my-theme
`
4) Generate the Salla theme via the existing adapter
`
node tools/adapter-bridge.js my-theme
`
5) Verify outputs
`
# Canonical JSON
smart-input/canonical/my-theme/

# Salla build + ZIP
build/salla/
build/beto-theme.zip
`

## Commands Cheat Sheet
- Initialize: 
pm run smart-init
- Parse once: 
pm run smart-parse <folder>
- Watch for new folders: 
pm run smart-watch
- Minimal CLI: 
pm run smart -- parse <folder> or 
pm run smart -- watch
- Manual adapter run: 
ode tools/adapter-bridge.js <folder>

## Troubleshooting
- "Folder not found": Ensure your folder exists at smart-input/input/<folder>.
- "No HTML found": Add at least one .html file (ideally index.html) to the folder.
- Windows path issues: Prefer PowerShell and use forward slashes or escaped backslashes.
- Adapter step fails: Check input/index.html was created; rerun 
ode core/input.js or the full build steps individually.
- Permission errors: Close any app that may lock files; re-run shell as Administrator if needed.

## Success Criteria
- A user drops a folder into smart-input/input/
- Running 
pm run smart-parse <folder> produces canonical JSON
- Running the adapter bridge generates uild/beto-theme.zip

> Working > Perfect. Add features later; keep the core flow simple and reliable.
