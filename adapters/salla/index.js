const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');\nconst archiver = require('archiver');

class SallaAdapter {
  constructor(){ this.root = process.cwd(); }
  async generateFromCanonical(canonicalPath, options = {}){\n    const full = path.resolve(canonicalPath);\n    const stat = await fs.stat(full).catch(()=>null);\n    if (!stat) throw new Error(Canonical path not found: );\n\n    const folderName = path.basename(full);\n    const themeOutputDir = path.join('build','salla-themes', folderName);\n    await fs.remove(themeOutputDir);\n    await fs.ensureDir(themeOutputDir);\n\n    const rootCanonicalDir = path.join(this.root, 'canonical');\n    await fs.ensureDir(rootCanonicalDir);\n    const targetTheme = path.join(rootCanonicalDir, 'theme.json');\n\n    if (stat.isFile()){ await fs.copy(full, targetTheme); } else { const themeInDir = path.join(full,'theme.json'); if (await fs.pathExists(themeInDir)) { await fs.copy(themeInDir, targetTheme); } else { const files=(await fs.readdir(full)).filter(f=>f.endsWith('.json')); if(!files.length) throw new Error('No JSON files in canonical directory'); const first=path.join(full, files[0]); const data=await fs.readJson(first).catch(()=>({})); const model=this._synthesizeModel(data); await fs.writeJson(targetTheme, model, { spaces: 2 }); } }
\n    // Run adapter pipeline into default build/salla, then copy into namespaced dir
    await this.runAdapterPipeline(canonicalPath);
    const srcBuild = path.join('build','salla');
    await fs.copy(srcBuild, themeOutputDir, { overwrite: true });
\n    // Zip
    const zipPath = path.join('build','salla-themes', folderName + '.zip');
    await fs.ensureDir(path.dirname(zipPath));
    await this.zipDir(themeOutputDir, zipPath);
    console.log(✅ Generated: );\n    console.log(📦 Zipped: );\n    return { themeOutputDir, zipPath };
  }\n  _synthesizeModel(data){
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

  async runAdapterPipeline(canonicalPath){
    const steps = [ ['node',['core/adapter-salla.js']], ['node',['core/assets.js']], ['node',['core/locales.js']], ['node',['core/export.js']] ];
    for (const [cmd,args] of steps){ const r = spawnSync(cmd, args, { stdio:'inherit', shell: process.platform==='win32' }); if (r.status!==0) throw new Error(Adapter step failed:  ); }
  }
  async zipDir(srcDir, destZip){ await new Promise((res,rej)=>{ const fs=require('fs'); const output=fs.createWriteStream(destZip); const archive=archiver('zip',{zlib:{level:9}}); output.on('close',()=>res(true)); archive.on('error',rej); archive.pipe(output); archive.directory(srcDir, false); archive.finalize(); }); }
module.exports = SallaAdapter;

// CLI usage: node adapters/salla/index.js <canonicalPath>
if (require.main === module){
  const p = process.argv[2] || path.join('canonical','theme.json');
  const run = async()=>{
    try { const a = new SallaAdapter(); await a.generateFromCanonical(p); console.log('✅ Salla adapter run complete'); process.exit(0);} catch(e){ console.error('❌ Salla adapter failed:', e.message); process.exit(1);} }
  run();
}

