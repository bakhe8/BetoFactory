<!-- 🚀 BETO FACTORY STATUS DASHBOARD -->
<p align="center">
  <img src="https://github.com/bakhe8/BetoFactory/assets/branding/factory-banner.png" alt="Beto Factory Banner" width="100%">
</p>

<p align="center">
  <b>🧩 BETO FACTORY — CORE EDITION</b><br>\r\n  <i>Smart Theme Factory • Canonical Processing • Multi‑platform Adapters</i>
</p>

<p align="center">

  <!-- 🔹 BUILD STATUS -->
  <a href="https://github.com/bakhe8/BetoFactory/actions/workflows/ci.yml">
    <img src="https://github.com/bakhe8/BetoFactory/actions/workflows/ci.yml/badge.svg" alt="Build Status">
  </a>

  <!-- 🔹 QA -->
  <a href="https://github.com/bakhe8/BetoFactory/actions/workflows/qa.yml">
    <img src="https://img.shields.io/badge/QA_Pipeline-Passing-brightgreen?logo=github" alt="QA Status">
  </a>

  <!-- 🔹 TESTS -->
  <a href="https://github.com/bakhe8/BetoFactory/actions/workflows/test.yml">
    <img src="https://img.shields.io/badge/Tests-164_passed-blue?logo=jest" alt="Test Coverage">
  </a>

  <!-- 🔹 DOCS -->
  <a href="https://github.com/bakhe8/BetoFactory/tree/main/docs">
    <img src="https://img.shields.io/badge/Docs_Coverage-98%25-blue?logo=readthedocs" alt="Docs Coverage">
  </a>

  <!-- 🔹 RELEASE -->
  <a href="https://github.com/bakhe8/BetoFactory/releases">
    <img src="https://img.shields.io/github/v/release/bakhe8/BetoFactory?color=blueviolet&logo=github" alt="Latest Release">
  </a>

  <!-- 🔹 LAST COMMIT -->
  <a href="https://github.com/bakhe8/BetoFactory/commits/main">
    <img src="https://img.shields.io/github/last-commit/bakhe8/BetoFactory?color=orange&logo=git" alt="Last Commit">
  </a>

  <!-- 🔹 LICENSE -->
  <a href="https://github.com/bakhe8/BetoFactory/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/bakhe8/BetoFactory?color=yellow" alt="License">
  </a>

</p>

<p align="center">
  <b>Status:</b> <i>Active Development</i> | <b>Maintainer:</b> <a href="https://github.com/bakhe8">Bakheet</a>  
</p>

---

##

---

## 🚀 Quick Start (v2.2.0)\r\n\r\n```bash\r\n# Install\r\nnpm install\r\n\r\n# Start dashboard (server + Vite dev)\r\nnpm run dashboard\r\n\r\n# Open UI\r\nhttp://localhost:5173\r\n```\r\n\r\nFrom the dashboard:\r\n- Upload a ZIP to Input (or drop a folder under `smart-input/input/<theme>`)\r\n- Select platforms (Salla/Zid/Shopify) and click Build or Rebuild\r\n- Watch live progress; download ZIP/manifest per platform; review QA\r\n\r\n---

## 📘 Documentation Hub (selected)\r\n\r\n| Purpose | File |\r\n|----------|------|\r\n| ⚡ Quickstart (Smart Input) | `docs/SMART-INPUT-QUICKSTART.md` |\r\n| 🧭 Developer Kickoff | `docs/DEVELOPER_KICKOFF_GUIDE.md` |\r\n| 🧩 Adapter SDK | `docs/adapters/SDK.md` |\r\n| 📊 Dashboard Guide | `docs/DASHBOARD-GUIDE.md` |\r\n| 🗺️ Roadmap & Progress | `docs/factory-progress.md`, `docs/roadmap.html` |\r\n\r\n----------|------|
| ⚡ Quickstart (Fast Mode) | [`docs/SMART-INPUT-QUICKSTART.md`](../../Downloads/docs/SMART-INPUT-QUICKSTART.md) |
| 🧩 Salla Adapter Guide | [`docs/SALLA-ADAPTER-GUIDE.md`](../../Downloads/docs/SALLA-ADAPTER-GUIDE.md) |
| 🏭 Factory Build Flow | [`docs/FACTORY-BUILD-FLOW.md`](../../Downloads/docs/FACTORY-BUILD-FLOW.md) |
| 💻 CLI Reference | [`docs/CLI.md`](../../Downloads/docs/CLI.md) |
| 🧠 API Overview | [`docs/API.md`](../../Downloads/docs/API.md) |
| 👥 Partner Setup Guide | [`docs/PARTNER-SETUP.md`](../../Downloads/docs/PARTNER-SETUP.md) |
| 🧾 Developer Kickoff Guide | [`docs/DEVELOPER_KICKOFF_GUIDE.md`](../../Downloads/docs/DEVELOPER_KICKOFF_GUIDE.md) |
| 🗺️ Roadmap | [`docs/roadmap.html`](../../Downloads/docs/roadmap.html) |

---

## 🧱 Outputs & Layout\r\n\r\nEach theme build produces:\r\n\r\n```\r\nsmart-input/\r\n ├─ input/<theme>/\r\n └─ canonical/<theme>/\r\n     ├─ index.json, theme.json, qa-summary.json\r\n     └─ assets-manifest.json\r\n\r\nbuild/\r\n ├─ salla-themes/<theme>/ (manifest.json, ZIP)\r\n ├─ zid-themes/<theme>/ (manifest.json, ZIP)\r\n └─ shopify-themes/<theme>/ (manifest.json, ZIP)\r\n\r\nqa/\r\n ├─ reports/<theme>-QA.json, <theme>-QA.html\r\n └─ screenshots/<theme>/current-*.png\r\n```\r\n\r\n**Manifest Fields (unified)**\r\n\r\n| Field | Description |\r\n|--------|-------------|\r\n| `folder` | Theme namespace |\r\n| `platform` | `salla` | `zid` | `shopify` |\r\n| `timestamp` | UTC build time |\r\n| `sectionsDetected` | Number of sections extracted |\r\n| `componentsExtracted` | Component count |\r\n| `assetsFound` | Total assets processed |\r\n| `assets` | List of emitted assets |\r\n\r\n## 🔧 CLI Cheatsheet\r\n\r\n- Build one theme (with QA): `node src/cli/factory-build.cjs <folder>`\r\n- Multi-platform: `SMART_PLATFORMS=salla,zid,shopify node src/cli/factory-build.cjs <folder>`\r\n- Stability: `npm run stability -- --themes=<t1>,<t2> --cycles=5 --no-consume`\r\n- QA only: `npm run qa:run -- <folder>`\r\n\r\n## 🧪 Nightly Stability + QA\r\n\r\n- GitHub Actions workflow `.github/workflows/nightly.yml` runs nightly at 03:00 UTC\r\n- Artifacts: logs, QA reports, screenshots\r\n\r\n## 🔐 Auth Token (optional)\r\n\r\nSome endpoints accept `Authorization: Bearer` header (e.g., uploads/builds). In the dashboard, set `localStorage.factoryToken` to your token to include it automatically.\r\n
