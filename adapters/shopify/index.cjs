const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class ShopifyAdapter {
  constructor() { this.root = process.cwd(); }

  async generateFromCanonical(canonicalPath) {
    const full = path.resolve(canonicalPath);
    const stat = await fs.stat(full).catch(()=>null);
    if (!stat) throw new Error(`Canonical path not found: ${full}`);
    const folderName = path.basename(full);

    // Load adapters.json for outputDir/zip
    let outputBase = path.join('build','shopify-themes'); let zipEnabled = true;
    try {
      const cfg = await fs.readJson(path.join('config','adapters.json')).catch(()=>null);
      if (cfg && cfg.adapters && cfg.adapters.shopify){
        if (cfg.adapters.shopify.outputDir) outputBase = cfg.adapters.shopify.outputDir;
        if (typeof cfg.adapters.shopify.zip === 'boolean') zipEnabled = cfg.adapters.shopify.zip;
      }
    } catch {}

    const outDir = path.join(outputBase, folderName);
    await fs.remove(outDir); await fs.ensureDir(outDir);

    // Minimal Shopify structure (OS 2.0 friendly skeleton)
    await fs.ensureDir(path.join(outDir, 'assets'));
    await fs.ensureDir(path.join(outDir, 'layout'));
    await fs.ensureDir(path.join(outDir, 'templates'));
    await fs.ensureDir(path.join(outDir, 'sections'));
    await fs.ensureDir(path.join(outDir, 'config'));

    const themeLiquid = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>{{ page_title }}</title>\n  {{ content_for_header }}\n</head>\n<body>\n  {{ content_for_layout }}\n</body>\n</html>\n`;
    await fs.writeFile(path.join(outDir, 'layout', 'theme.liquid'), themeLiquid, 'utf8');

    const indexLiquid = `{% section 'main-index' %}\n`;
    await fs.writeFile(path.join(outDir, 'templates', 'index.liquid'), indexLiquid, 'utf8');

    const mainSection = `<!-- Auto-generated scaffold -->\n<section class="main-index">\n  <h1>{{ shop.name }}</h1>\n</section>\n`;
    await fs.writeFile(path.join(outDir, 'sections', 'main-index.liquid'), mainSection, 'utf8');

    const settingsSchema = [
      { "name": "Theme settings", "settings": [] }
    ];
    await fs.writeJson(path.join(outDir, 'config', 'settings_schema.json'), settingsSchema, { spaces: 2 });

    // Carry over a basic manifest for traceability
    let metaTitle = null;
    try {
      const canonicalTheme = path.join(full, 'theme.json');
      if (await fs.pathExists(canonicalTheme)) {
        const json = await fs.readJson(canonicalTheme).catch(()=>({}));
        metaTitle = (json.meta && json.meta.title) || null;
      }
    } catch {}
    await fs.writeJson(path.join(outDir, 'beto-manifest.json'), {
      folder: folderName,
      platform: 'shopify',
      generatedAt: new Date().toISOString(),
      title: metaTitle,
      sourceCanonicalPath: full
    }, { spaces: 2 });

    // Zip (optional)
    let zipPath = null;
    if (zipEnabled) {
      zipPath = path.join(outputBase, `${folderName}.zip`);
      await fs.ensureDir(path.dirname(zipPath));
      await new Promise((resolve, reject) => {
        const fsNode = require('fs');
        const output = fsNode.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(outDir, false);
        archive.finalize();
      });
      console.log(`📦 Zipped: ${zipPath}`);
    }

    console.log(`✅ Generated: ${outDir}`);
    return { themeOutputDir: outDir, zipPath };
  }
}

module.exports = ShopifyAdapter;

