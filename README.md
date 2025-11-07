<!-- 🚀 BETO FACTORY STATUS DASHBOARD -->
<p align="center">
  <img src="https://github.com/bakhe8/BetoFactory/assets/branding/factory-banner.png" alt="Beto Factory Banner" width="100%" />
</p>

<p align="center">
  <b>🧩 BETO FACTORY — CORE EDITION</b><br />
  <i>Smart Theme Factory • Canonical Processing • Multi‑platform Adapters</i>
</p>

<p align="center">
  <a href="https://github.com/bakhe8/BetoFactory/actions/workflows/ci.yml"><img src="https://github.com/bakhe8/BetoFactory/actions/workflows/ci.yml/badge.svg" alt="Build" /></a>
  <a href="https://github.com/bakhe8/BetoFactory/actions/workflows/nightly.yml"><img src="https://img.shields.io/badge/Nightly_QA-Passing-brightgreen?logo=github" alt="Nightly QA" /></a>
  <a href="https://github.com/bakhe8/BetoFactory/tree/main/docs"><img src="https://img.shields.io/badge/Docs-Updated-blue?logo=readthedocs" alt="Docs" /></a>
  <a href="https://github.com/bakhe8/BetoFactory/releases"><img src="https://img.shields.io/github/v/release/bakhe8/BetoFactory?color=blueviolet&logo=github" alt="Release" /></a>
  <a href="https://github.com/bakhe8/BetoFactory/commits/main"><img src="https://img.shields.io/github/last-commit/bakhe8/BetoFactory?color=orange&logo=git" alt="Last Commit" /></a>
  <a href="https://github.com/bakhe8/BetoFactory/blob/main/LICENSE"><img src="https://img.shields.io/github/license/bakhe8/BetoFactory?color=yellow" alt="License" /></a>
</p>

<p align="center">
  <b>Status:</b> <i>Active Development</i> • <b>Maintainer:</b> <a href="https://github.com/bakhe8">Bakheet</a>
</p>

# 🧩 Beto Factory — Core Edition

⚙️ Beto Factory is a modular theme factory that transforms raw HTML into a canonical JSON model, adapts it to target platforms (Salla, Zid, Shopify), validates and packages ready‑to‑upload themes.

## 🚀 Quick Start (v2.2.1)

```bash
## Install
npm install

## Start the dashboard (server + Vite dev)
npm run dashboard

## Open UI
http://localhost:5173
```

In the dashboard:
- Upload a ZIP to Input (or drop a folder under `smart-input/input/<theme>`)
- Open Config and set your Factory Token if the server requires auth
- Select platforms (Salla/Zid/Shopify) and click Build/Rebuild
- Watch live progress; download ZIP/manifest per platform; review QA

---

## 📘 Documentation Hub (selected)

| Purpose | File |
|----------|------|
| ⚡ Quickstart (Smart Input) | [docs/SMART-INPUT-QUICKSTART.md](docs/SMART-INPUT-QUICKSTART.md) |
| 🧭 Developer Kickoff | [docs/DEVELOPER_KICKOFF_GUIDE.md](docs/DEVELOPER_KICKOFF_GUIDE.md) |
| 🧩 Adapter SDK | [docs/adapters/SDK.md](docs/adapters/SDK.md) |
| 📊 Dashboard Guide | [docs/DASHBOARD-GUIDE.md](docs/DASHBOARD-GUIDE.md) |
| 🗺️ Roadmap & Progress | [docs/factory-progress.md](docs/factory-progress.md), [docs/roadmap.html](docs/roadmap.html) |
| 📚 Full Docs Index | [docs/](docs/README.md) |

---

## 🧱 Outputs & Layout

Each theme build produces:

```
smart-input/
 ├─ input/<theme>/
 └─ canonical/<theme>/
     ├─ index.json, theme.json, qa-summary.json
     └─ assets-manifest.json

build/
 ├─ salla-themes/<theme>/ (manifest.json, ZIP)
 ├─ zid-themes/<theme>/ (manifest.json, ZIP)
 └─ shopify-themes/<theme>/ (manifest.json, ZIP)

qa/
 ├─ reports/<theme>-QA.json, <theme>-QA.html
 └─ screenshots/<theme>/current-*.png
```

**Manifest Fields (unified)**

| Field | Description |
|--------|-------------|
| `folder` | Theme namespace |
| `platform` | salla | zid | shopify |
| `timestamp` | UTC build time |
| `sectionsDetected` | Number of sections extracted |
| `componentsExtracted` | Component count |
| `assetsFound` | Total assets processed |
| `assets` | List of emitted assets |

## 🔧 CLI Cheatsheet

- Build one theme (with QA): `node src/cli/factory-build.cjs <folder>`
- Multi-platform: `SMART_PLATFORMS=salla,zid,shopify node src/cli/factory-build.cjs <folder>`
- Stability: `npm run stability -- --themes=<t1>,<t2> --cycles=5 --no-consume`
- QA only: `npm run qa:run -- <folder>`

## 🧪 Nightly Stability + QA

- GitHub Actions workflow `.github/workflows/nightly.yml` runs nightly at 03:00 UTC
- Artifacts: logs, QA reports, screenshots

## 🔐 Auth Token (optional)

Some endpoints accept `Authorization: Bearer` header (e.g., uploads/builds).

- Recommended: Use the Dashboard Config panel (header → Config) to save your token. The UI stores it as `localStorage.factoryToken` and sends it automatically.
- Alternative: Manually set `localStorage.factoryToken = '<your-secret>'` in the browser console.

## 🆕 What’s New in v2.2.0

- Multi‑platform adapters (Salla default; optional Zid/Shopify) with unified `manifest.json` including `platform`.
- Dashboard enhancements: build progress bar, toasts, per‑platform status, downloads, canonical export, QA summary.
- Automatic QA post‑build: JSON + HTML reports; visual diffs and budgets; nightly workflow with artifacts.
- Stability tooling: `stability-runner`, ZIP extractor, watcher utilities.
- Docs refreshed and CHANGELOG added; release tag `v2.2.0` published.
