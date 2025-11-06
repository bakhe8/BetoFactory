<!-- 🚀 BETO FACTORY STATUS DASHBOARD -->
<p align="center">
  <img src="https://github.com/bakhe8/BetoFactory/assets/branding/factory-banner.png" alt="Beto Factory Banner" width="100%">
</p>

<p align="center">
  <b>🧩 BETO FACTORY — CORE EDITION (SALLA ONLY)</b><br>
  <i>Smart Theme Factory • Canonical Processing • Salla Twig Adaptation</i>
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

# 🧩 **Beto Factory — Core Edition (Salla Only)**  

> ⚙️ **Beto Factory** is a modular *theme-manufacturing system* that transforms raw HTML into a **canonical JSON model**, adapts it to **Salla’s Twilight (Twig)** engine, validates and packages it into ready-to-upload themes.  

---

## 🚀 Quick Start

```bash
npm install
npm run build
npm run preview
```

Open → [http://localhost:5173](http://localhost:5173)

---

## 📘 Documentation Hub

| Purpose | File |
|----------|------|
| ⚡ Quickstart (Fast Mode) | [`docs/SMART-INPUT-QUICKSTART.md`](../../Downloads/docs/SMART-INPUT-QUICKSTART.md) |
| 🧩 Salla Adapter Guide | [`docs/SALLA-ADAPTER-GUIDE.md`](../../Downloads/docs/SALLA-ADAPTER-GUIDE.md) |
| 🏭 Factory Build Flow | [`docs/FACTORY-BUILD-FLOW.md`](../../Downloads/docs/FACTORY-BUILD-FLOW.md) |
| 💻 CLI Reference | [`docs/CLI.md`](../../Downloads/docs/CLI.md) |
| 🧠 API Overview | [`docs/API.md`](../../Downloads/docs/API.md) |
| 👥 Partner Setup Guide | [`docs/PARTNER-SETUP.md`](../../Downloads/docs/PARTNER-SETUP.md) |
| 🧾 Developer Kickoff Guide | [`docs/DEVELOPER_KICKOFF_GUIDE.md`](../../Downloads/docs/DEVELOPER_KICKOFF_GUIDE.md) |
| 🗺️ Roadmap | [`docs/roadmap.html`](../../Downloads/docs/roadmap.html) |

---

## 🧱 Build Output Structure

Each theme build produces:

```
build/
 └── salla/
      ├── templates/*.twig
      ├── theme.json
      └── beto-theme.zip
canonical/<theme>/theme.json
```

**Manifest Fields**

| Field | Description |
|--------|-------------|
| `folder` | Theme namespace |
| `timestamp` | UTC build time |
| `sectionsDetected` | Number of sections extracted |
| `componentsExtracted` | Component count |
| `assetsFound` | Total assets processed |
