# Beto Factory Adapter SDK (Draft)

This SDK describes how to add a new platform adapter that converts canonical JSON into a deployable theme.

## Concepts
- Canonical folder: `smart-input/canonical/<folder>` containing `theme.json` (+ optional `meta.json`, `qa-summary.json`). Root `canonical/` is used only as a temporary staging area by the adapter.
- Adapter registry: `config/adapters.json` lists supported platforms and module entry points.
- Adapter Manager: `core/adapter-manager.cjs` loads adapters and invokes generation; the factory build uses it (see `SMART_PLATFORMS`).

## Adapter Interface
Implement a Node class that exports either of the following methods:
- `async generateFromCanonical(canonicalPath): { themeOutputDir, zipPath? }`
- Optional alias: `async generate(canonicalPath)` that calls `generateFromCanonical`.

Recommended constructor: `constructor() { this.root = process.cwd(); }`

## Registry Entry
Add an entry to `config/adapters.json`:
```
{
  "adapters": {
    "myplatform": {
      "module": "./adapters/myplatform/index.cjs",
      "outputDir": "build/myplatform-themes",
      "zip": true,
      "engine": "liquid"
    }
  }
}
```

## Platform Profile (optional)
Create `config/platforms/myplatform.json` to document:
- `engine` (twig/jinja/liquid/...)
- `structure` (folder layout names)
- `extensions` (template/style/script)
- `helpers` (asset/url helper hints)

## CLI
Use the adapter CLI:
- `npm run adapt:cli -- adapt --platform <name> --folder <folder>`
- `npm run adapt:cli -- adapt-all --folder <folder>`

## Validation Hooks
Integrate platform validators (e.g., `salla theme validate`, `shopify theme check`) inside the adapter, after writing the output directory.

## Tips
- Keep platform-specific logic inside the adapter folder.
- Do not mutate canonical files; copy and transform into build outputs.
- Emit `manifest.json` with the unified fields: `folder`, `platform`, `timestamp`, `sourceCanonicalPath`, `sectionsDetected`, `componentsExtracted`, `assetsFound`, `assets`. Consider adding platform validators (e.g., `shopify theme check`).

