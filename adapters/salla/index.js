const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

class SallaAdapter {
  constructor() {
    this.root = process.cwd();
  }

  async generateFromCanonical(canonicalPath, options = {}) {
    const full = path.resolve(canonicalPath);
    const stat = await fs.stat(full).catch(() => null);
    if (!stat) throw new Error(`Canonical path not found: ${full}`);

    const folderName = path.basename(full);
    const themeOutputDir = path.join('build', 'salla-themes', folderName);
    await fs.remove(themeOutputDir);
    await fs.ensureDir(themeOutputDir);

    // Prepare canonical/theme.json expected by core pipeline
    const rootCanonicalDir = path.join(this.root, 'canonical');
    await fs.ensureDir(rootCanonicalDir);
    const targetTheme = path.join(rootCanonicalDir, 'theme.json');

    if (stat.isFile()) {
      await fs.copy(full, targetTheme);
    } else {
      const themeInDir = path.join(full, 'theme.json');
      if (await fs.pathExists(themeInDir)) {
        await fs.copy(themeInDir, targetTheme);
      } else {
        const files = (await fs.readdir(full)).filter((f) => f.endsWith('.json'));
        if (!files.length) throw new Error('No JSON files in canonical directory');
        const first = path.join(full, files[0]);
        const data = await fs.readJson(first).catch(() => ({}));
        const model = this._synthesizeModel(data);
        await fs.writeJson(targetTheme, model, { spaces: 2 });
      }
    }

    // Run adapter pipeline into default build/salla, then copy into namespaced dir
    await this.runAdapterPipeline();
    const srcBuild = path.join('build', 'salla');
    await fs.copy(srcBuild, themeOutputDir, { overwrite: true });

    // Zip namespaced output
    const zipPath = path.join('build', 'salla-themes', `${folderName}.zip`);
    await fs.ensureDir(path.dirname(zipPath));
    await this.zipDir(themeOutputDir, zipPath);
    console.log(`✅ Generated: ${themeOutputDir}`);
    console.log(`📦 Zipped: ${zipPath}`);
    return { themeOutputDir, zipPath };
  }

  _synthesizeModel(data) {
    const title = (data && data.metadata && data.metadata.title) || 'Untitled';
    const sections = Array.isArray(data && data.sections) ? data.sections : [];
    const hero = sections.find((s) => s && s.type === 'hero') || {};
    const heroSettings = hero.settings || {};
    const images = (data && data.assets && data.assets.images) || [];
    return {
      $schema: 'https://beto.factory/schema/canonical.json',
      metadata: { title },
      layout: { header: 'default', footer: 'default' },
      sections: [],
      components: {
        hero: {
          type: 'banner',
          props: {
            title: heroSettings.title || title,
            image: heroSettings.image || images[0] || null,
          },
        },
      },
      assets: { images },
    };
  }

  async runAdapterPipeline() {
    const steps = [
      ['node', ['core/adapter-salla.js']],
      ['node', ['core/assets.js']],
      ['node', ['core/locales.js']],
      ['node', ['core/export.js']],
    ];
    for (const [cmd, args] of steps) {
      const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
      if (r.status !== 0) throw new Error(`Adapter step failed: ${cmd} ${args.join(' ')}`);
    }
  }

  async zipDir(srcDir, destZip) {
    await new Promise((resolve, reject) => {
      const fsNode = require('fs');
      const output = fsNode.createWriteStream(destZip);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve(true));
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(srcDir, false);
      archive.finalize();
    });
  }
}

module.exports = SallaAdapter;

// CLI usage: node adapters/salla/index.js <canonicalPath>
if (require.main === module) {
  const p = process.argv[2] || path.join('canonical', 'theme.json');
  const run = async () => {
    try {
      const a = new SallaAdapter();
      await a.generateFromCanonical(p);
      console.log('✅ Salla adapter run complete');
      process.exit(0);
    } catch (e) {
      console.error('❌ Salla adapter failed:', e && e.message ? e.message : e);
      process.exit(1);
    }
  };
  run();
}

