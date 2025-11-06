const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class ZidAdapter {
  constructor() { this.root = process.cwd(); }

  async generateFromCanonical(canonicalPath) {
    const full = path.resolve(canonicalPath);
    const stat = await fs.stat(full).catch(()=>null);
    if (!stat) throw new Error(`Canonical path not found: ${full}`);
    const folderName = path.basename(full);

    // Load adapters.json for outputDir/zip
    let outputBase = path.join('build','zid-themes'); let zipEnabled = true;
    try {
      const cfg = await fs.readJson(path.join('config','adapters.json')).catch(()=>null);
      if (cfg && cfg.adapters && cfg.adapters.zid){
        if (cfg.adapters.zid.outputDir) outputBase = cfg.adapters.zid.outputDir;
        if (typeof cfg.adapters.zid.zip === 'boolean') zipEnabled = cfg.adapters.zid.zip;
      }
    } catch {}

    const outDir = path.join(outputBase, folderName);
    await fs.remove(outDir); await fs.ensureDir(outDir);

    // Read canonical theme.json
    let canonical = {};
    const themeJson = path.join(full, 'theme.json');
    if (await fs.pathExists(themeJson)) {
      canonical = await fs.readJson(themeJson).catch(()=>({}));
    }

    // Minimal Zid structure (scaffold)
    const templatesDir = path.join(outDir, 'templates');
    await fs.ensureDir(templatesDir);

    const metaTitle = (canonical && canonical.meta && canonical.meta.title) || 'Zid Theme';
    const indexJinja = `<!DOCTYPE html>\n<html>\n<head>\n  <title>{{ title }}</title>\n</head>\n<body>\n  <h1>{{ title }}</h1>\n  {# Scaffold generated from canonical model #}\n</body>\n</html>\n`;
    await fs.writeFile(path.join(templatesDir, 'index.jinja'), indexJinja, 'utf8');

    // Write manifest.json (unified shape)
    const manifest = {
      folder: folderName,
      platform: 'zid',
      timestamp: new Date().toISOString(),
      title: metaTitle,
      sourceCanonicalPath: full,
      sectionsDetected: (canonical && Array.isArray(canonical.sections)) ? canonical.sections.length : 0,
      componentsExtracted: (canonical && canonical.components && typeof canonical.components==='object') ? Object.keys(canonical.components).length : 0,
      assetsFound: 0,
      assets: []
    };
    // Best-effort asset listing
    try {
      const assetsRoot = path.join(outDir, 'assets');
      const list = [];
      const walk = async (d) => { const items = await fs.readdir(d).catch(()=>[]); for (const it of items) { const p = path.join(d,it); const st = await fs.stat(p); if (st.isDirectory()) await walk(p); else list.push(path.relative(outDir,p).replace(/\\/g,'/')); } };
      if (await fs.pathExists(assetsRoot)) await walk(assetsRoot);
      manifest.assets = list;
      manifest.assetsFound = list.length;
    } catch {}
    await fs.writeJson(path.join(outDir, 'manifest.json'), manifest, { spaces: 2 });

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

module.exports = ZidAdapter;
