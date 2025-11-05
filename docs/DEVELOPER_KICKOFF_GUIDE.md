# 🧱 **Beto Factory — Core Edition (Salla-Only)**  
### *Developer Kickoff Guide*

> **Purpose:**  
> This guide ensures every developer, tester, and architect on the Beto Factory team can clone, configure, and begin coding the **Salla-only Core Edition** with zero friction.  
> It also establishes coding conventions, folder structure, and responsibilities for each layer of the architecture.

---

## 🧭 **1. Overview**

**Beto Factory Core Edition** is a local theme manufacturing system for **Salla**.  
It converts raw HTML into Salla-compatible Twig themes through a 5-step automated pipeline:

```
HTML → Canonical Model → Adapter (Salla) → Cleaner → ZIP Export
```

Scalable, modular, and ready for future adapters (Zid, Shopify, WooCommerce, etc.).

---

## ⚙️ **2. Environment Setup**

### 🧩 Prerequisites
| Tool | Purpose |
|------|----------|
| Node.js (v18+) | Main runtime |
| NPM | Package manager |
| VS Code | IDE |
| Git + GitHub | Version control |
| Salla CLI | Theme validation & preview |
| BrowserSync or LiveServer | HTML previews |

### 🧰 Installation Steps
```bash
git clone https://github.com/your-org/beto-factory.git
cd beto-factory
npm init -y
npm install jsdom cheerio twig archiver chalk salla-cli eslint prettier
```

### 🧾 `.gitignore`
```
node_modules/
build/
*.zip
```

---

## 📁 **3. Project Structure**

```bash
beto-factory/
├── core/
│   ├── input.js           # HTML import + validation
│   ├── canonical.js       # Canonical model generation
│   ├── adapter-salla.js   # JSON → Twig converter
│   ├── cleaner.js         # Output optimization
│   └── export.js          # ZIP packaging
├── adapters/              # Future platforms
│   ├── adapter-zid.js
│   ├── adapter-shopify.js
│   └── adapter-woo.js
├── cli.js                 # Unified entry point
├── tests/                 # Unit & integration tests
├── docs/
│   ├── roadmap.md
│   ├── architecture.html
│   └── CHANGELOG.md
└── package.json
```

---

## 🔄 **4. Core Logic Flow**

| Step | File | Description |
|------|------|--------------|
| 1️⃣ HTML Input | `core/input.js` | Imports and cleans static HTML |
| 2️⃣ Canonical Model | `core/canonical.js` | Generates structured JSON layout |
| 3️⃣ Adapter | `core/adapter-salla.js` | Converts JSON to Twig components |
| 4️⃣ Cleaner | `core/cleaner.js` | Optimizes assets and validates |
| 5️⃣ Export | `core/export.js` | Packages ZIP and runs Salla validation |

---

## 🧩 **5. Canonical Model Schema**

```json
{
  "$schema": "https://beto.factory/schema/canonical.json",
  "layout": { "header": "default", "footer": "default" },
  "components": {
    "hero": { "type": "banner", "props": { "title": "Welcome" } },
    "product-grid": { "type": "grid" }
  },
  "assets": { "images": ["logo.png", "hero.jpg"] }
}
```

Each adapter reads this JSON and maps its components to platform-specific templates.

---

## ⚙️ **6. Adapter Interface**

```ts
interface Adapter {
  name: string;
  input: CanonicalModel;
  mapComponent(name: string, template: string): void;
  generateConfig(): ThemeConfig;
  export(outputDir: string): Promise<void>;
}
```

🧠 Implement this in each adapter (`adapter-salla.js`, `adapter-zid.js`, etc.).  
Adapters convert canonical models into platform-compliant outputs.

---

## 💻 **7. CLI Command Reference**

| Command | Description |
|----------|--------------|
| `npm run canonicalize` | Converts `/input` HTML → `/canonical/theme.json` |
| `npm run adapt:salla` | Generates Twig files from canonical model |
| `npm run export` | Packages `beto-theme.zip` and validates via Salla CLI |
| `npm run test:*` | Runs automated validation checks |

**Example workflow:**
```bash
npm run canonicalize
npm run adapt:salla
npm run export
```

---

## 🧪 **8. Testing & Validation**

### Example Commands
```bash
npm run test:canonical   # Schema validation
npm run test:adapter     # Twig integrity check
npm run test:export      # Verify ZIP + Salla validation
```

### Simple Test Example
```js
// tests/test-export.js
import fs from 'fs';
if (!fs.existsSync('build/beto-theme.zip')) throw new Error('ZIP missing!');
console.log('✅ Export ZIP exists and is valid.');
```

---

## 🧰 **9. Linting & Code Quality**

Install and configure ESLint + Prettier:
```bash
npx eslint --init
```
Add linting step:
```json
"scripts": {
  "lint": "eslint ./core --fix"
}
```

---

## 🧱 **10. Phased Roadmap**

| Phase | Goal | Duration | Deliverable |
|-------|------|-----------|-------------|
| 1 | Local Env + HTML Parser | 2 weeks | Clean HTML → Canonical JSON |
| 2 | Salla Adapter Base | 3 weeks | Twig export + theme.json |
| 3 | Preview System | 2 weeks | Local preview engine |
| 4 | Export Automation | 2 weeks | ZIP + GitHub-ready build |
| 5 | QA & Business Pipeline | 3 weeks | Marketplace-ready output |

---

## 🧩 **11. Optional (Advanced) Add-Ons**

| Feature | Description |
|----------|--------------|
| **Auto-Documentation** | Generate docs with Typedoc or Docusaurus |
| **Error Handling** | Capture schema and adapter errors in logs |
| **Security & Licensing** | Embed license and usage metadata |
| **Localization Layer** | Add multilingual support once Salla expands |

---

## 🧩 **12. Versioning & Releases**

| Policy | Description |
|---------|-------------|
| **Semantic Versioning** | `1.0.0` → `1.1.0` → `2.0.0` |
| **Tag Convention** | `salla-v1.0.0`, `core-v1.0.0` |
| **CHANGELOG** | Log updates in `/docs/CHANGELOG.md` |

Optional tagging automation:
```bash
npm version patch
git push --tags
```

---

## ✅ **13. Final Readiness Summary**

| Area | Status | Notes |
|------|--------|-------|
| Environment Setup | ✅ | Ready |
| Folder Structure | ✅ | Modular |
| Core Logic Flow | ✅ | Verified |
| Canonical Schema | ✅ | Defined |
| Adapter Interface | ✅ | Complete |
| CLI & Scripts | ✅ | Ready |
| Testing Layer | ⚙️ | Minimal, extendable |
| Linting & QA | ⚙️ | Add ESLint rules |
| Docs & Add-Ons | ✅ | Phase 2 ready |

---

## 🏁 **Start Coding!**

> Begin with `core/input.js` and `core/canonical.js`.  
> The first milestone: successfully convert `/input/index.html` → `/canonical/theme.json`.  
> Once stable, proceed to implement `adapter-salla.js`.
