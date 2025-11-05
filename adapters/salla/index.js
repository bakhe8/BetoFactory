const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');

class SallaAdapter {
  constructor(){ this.root = process.cwd(); }
  async generateFromCanonical(canonicalPath){
    const full = path.resolve(canonicalPath);
    const stat = await fs.stat(full).catch(()=>null);
    if (!stat) throw new Error(Canonical path not found: );

    const rootCanonicalDir = path.join(this.root, 'canonical');
    await fs.ensureDir(rootCanonicalDir);
    const targetTheme = path.join(rootCanonicalDir, 'theme.json');

    if (stat.isFile()){
      // If a single file provided, copy as theme.json
      await fs.copy(full, targetTheme);
    } else {
      // Directory: prefer theme.json inside, else synthesize from first json
      const themeInDir = path.join(full, 'theme.json');
      if (await fs.pathExists(themeInDir)) {
        await fs.copy(themeInDir, targetTheme);
      } else {
        const files = (await fs.readdir(full)).filter(f=> f.endsWith('.json'));
        if (!files.length) throw new Error('No JSON files in canonical directory');
        const first = path.join(full, files[0]);
        const data = await fs.readJson(first).catch(()=>({}));
        const model = this._synthesizeModel(data);
        await fs.writeJson(targetTheme, model, { spaces: 2 });
      }
    }

    // Run adapter pipeline
    const steps = [ ['node',['core/adapter-salla.js']], ['node',['core/assets.js']], ['node',['core/locales.js']], ['node',['core/export.js']] ];
    for (const [cmd,args] of steps){
      const r = spawnSync(cmd, args, { stdio:'inherit', shell: process.platform==='win32' });
      if (r.status !== 0) throw new Error(Adapter step failed:  );
    }
    return true;
  }
  _synthesizeModel(data){
    const title = data?.metadata?.title || 'Untitled';
    const heroSettings = Array.isArray(data?.sections) ? (data.sections.find(s=> s.type==='hero')?.settings || {}) : {};
    const images = (data?.assets?.images) || [];
    return {
      "": "https://beto.factory/schema/canonical.json",
      metadata: { title },
      layout: { header: 'default', footer: 'default' },
      components: { hero: { type: 'banner', props: { title: heroSettings.title || title, image: heroSettings.image || images[0] || null } } },
      assets: { images }
    };
  }
}

module.exports = SallaAdapter;

// CLI usage: node adapters/salla/index.js <canonicalPath>
if (require.main === module){
  const p = process.argv[2] || path.join('canonical','theme.json');
  const run = async()=>{
    try { const a = new SallaAdapter(); await a.generateFromCanonical(p); console.log('✅ Salla adapter run complete'); process.exit(0);} catch(e){ console.error('❌ Salla adapter failed:', e.message); process.exit(1);} }
  run();
}
