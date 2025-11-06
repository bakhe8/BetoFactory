const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

class SallaAdapter {
  constructor() { this.root = process.cwd(); }
  async generate(canonicalPath) { return this.generateFromCanonical(canonicalPath); }
  async generateFromCanonical(canonicalPath) {
    const full = path.resolve(canonicalPath);
    const stat = await fs.stat(full).catch(()=>null);
    if (!stat) throw new Error(`Canonical path not found: ${full}`);
    const folderName = path.basename(full);
    // Config
    let outputBase = path.join('build','salla-themes'); let zipEnabled = true;
    try { const cfg = await fs.readJson(path.join('config','adapters.json')).catch(()=>null); if (cfg && cfg.adapters && cfg.adapters.salla){ if (cfg.adapters.salla.outputDir) outputBase = cfg.adapters.salla.outputDir; if (typeof cfg.adapters.salla.zip === 'boolean') zipEnabled = cfg.adapters.salla.zip; } } catch {}
    const themeOutputDir = path.join(outputBase, folderName);
    await fs.remove(themeOutputDir); await fs.ensureDir(themeOutputDir);
    // Load platform profile for structure/validation
    let profile = { structure: { templates: 'templates', assets: 'assets' } };
    try { profile = await fs.readJson(path.join('config','platforms','salla.json')); } catch {}
    const rootCanonicalDir = path.join(this.root, 'canonical'); await fs.ensureDir(rootCanonicalDir);
    const targetTheme = path.join(rootCanonicalDir, 'theme.json');
    if (stat.isFile()) { await fs.copy(full, targetTheme); }
    else { const themeInDir = path.join(full, 'theme.json'); if (await fs.pathExists(themeInDir)) { await fs.copy(themeInDir, targetTheme); } else { const files=(await fs.readdir(full)).filter(f=>f.endsWith('.json')); if(!files.length) throw new Error('No JSON files in canonical directory'); const first=path.join(full, files[0]); const data=await fs.readJson(first).catch(()=>({})); await fs.writeJson(targetTheme, data, { spaces: 2 }); } }
    await this.runAdapterPipeline();
    const srcBuild = path.join('build','salla'); await fs.copy(srcBuild, themeOutputDir, { overwrite:true });
    // Reconstruct files from canonical (sections -> templates) if mapping available
    try {
      const reconstruct = require('../../core/reconstruct.cjs');
      const canonicalJsonPath = path.join(full, 'theme.json');
      if (await fs.pathExists(canonicalJsonPath)){
        const canonicalJson = await fs.readJson(canonicalJsonPath).catch(()=>({}));
        await reconstruct.reconstruct('salla', canonicalJson, themeOutputDir);
      }
    } catch (e) { console.warn('ℹ️  Reconstruction skipped:', e && e.message ? e.message : e); }

    await this._validateStructure(themeOutputDir, profile);
    await this._optimizeImages(themeOutputDir).catch(()=>{});
    await this._writeManifest(themeOutputDir, full).catch(()=>{});
    let zipPath = null; if (zipEnabled){ zipPath = path.join(outputBase, `${folderName}.zip`); await fs.ensureDir(path.dirname(zipPath)); await this.zipDir(themeOutputDir, zipPath); console.log(`📦 Zipped: ${zipPath}`); }
    console.log(`✅ Generated: ${themeOutputDir}`); return { themeOutputDir, zipPath };
  }
  async runAdapterPipeline(){ const steps = [['node',['core/adapter-salla.js']],['node',['core/assets.js']],['node',['core/locales.js']],['node',['core/export.js']]]; for(const [cmd,args] of steps){ const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'}); if(r.status!==0) throw new Error(`Adapter step failed: ${cmd} ${args.join(' ')}`);} }
  async zipDir(srcDir, destZip){ await new Promise((resolve,reject)=>{ const fsNode=require('fs'); const output=fsNode.createWriteStream(destZip); const archive=archiver('zip',{zlib:{level:9}}); output.on('close',()=>resolve(true)); archive.on('error',reject); archive.pipe(output); archive.directory(srcDir,false); archive.finalize(); }); }
  async _validateStructure(dir, profile){ const tplDir=(profile && profile.structure && profile.structure.templates) || 'templates'; const must=[path.join(dir,tplDir,'index.twig'), path.join(dir,'theme.json')]; for (const p of must){ if (!(await fs.pathExists(p))){ console.warn(`⚠️  Missing expected file: ${p}`); } } }
  async _optimizeImages(dir){ let sharp; try { sharp=require('sharp'); } catch { console.warn('ℹ️  sharp not installed; skipping image optimization'); return; } const candidates=[]; const roots=[path.join(dir,'assets'), path.join(dir,'images')]; for(const root of roots){ if (!(await fs.pathExists(root))) continue; const walk=async(d)=>{ const entries=await fs.readdir(d); for(const name of entries){ const p=path.join(d,name); const st=await fs.stat(p); if(st.isDirectory()) await walk(p); else if(/\.(png|jpe?g)$/i.test(name)) candidates.push(p); } }; await walk(root);} for(const img of candidates){ const buf=await fs.readFile(img); if (/\.png$/i.test(img)){ const out=await sharp(buf).png({compressionLevel:8}).toBuffer(); if(out.length<buf.length) await fs.writeFile(img,out);} else { const out=await sharp(buf).jpeg({quality:82, mozjpeg:true}).toBuffer(); if(out.length<buf.length) await fs.writeFile(img,out);} } }
  async _writeManifest(dir, canonicalFullPath){ const crypto=require('crypto'); const list=[]; const roots=[path.join(dir,'assets'), path.join(dir,'images')]; for(const root of roots){ if (!(await fs.pathExists(root))) continue; const walk=async(d)=>{ const entries=await fs.readdir(d); for(const name of entries){ const p=path.join(d,name); const st=await fs.stat(p); if(st.isDirectory()) await walk(p); else { const data=await fs.readFile(p); const hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,16); list.push({ file: path.relative(dir,p).replace(/\\/g,'/'), size: st.size, sha256_16: hash }); } } }; await walk(root);} let qa={}; const folder=path.basename(dir); const qaPath=path.join('smart-input','canonical',folder,'qa-summary.json'); if (await fs.pathExists(qaPath)) qa = await fs.readJson(qaPath).catch(()=>({})); let metaTitle=null; try{ const themeJson=path.join(canonicalFullPath,'theme.json'); if (await fs.pathExists(themeJson)){ const data=await fs.readJson(themeJson); metaTitle=(data && data.meta && data.meta.title) || (data && data.metadata && data.metadata.title) || null; } } catch{}
    const manifest={ folder, timestamp:new Date().toISOString(), sourceCanonicalPath: canonicalFullPath, title: metaTitle, sectionsDetected: qa.sectionsDetected||0, componentsExtracted: qa.componentsExtracted||0, assetsFound: qa.assetsFound || list.length, assets: list };
    await fs.writeJson(path.join(dir,'manifest.json'), manifest, { spaces: 2 });
  }
}
module.exports = SallaAdapter;

