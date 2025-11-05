const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');

class AdapterBridge {
  static async generateFromSmartFolder(folderName){
    const processingPath = path.join('smart-input','processing', folderName);
    // Fallback to canonical folder if processing does not exist (already removed)
    let basePath = processingPath;
    if (!(await fs.pathExists(basePath))) basePath = path.join('smart-input','input', folderName);
    if (!(await fs.pathExists(basePath))) throw new Error(`Folder not found for adapter generation: ${folderName}`);

    // Choose main HTML
    const files = await fs.readdir(basePath);
    const html = files.find(f=> f.toLowerCase()==='index.html') || files.find(f=> f.toLowerCase().endsWith('.html'));
    if (!html) throw new Error('No HTML file found to feed adapter');
    const srcHtml = path.join(basePath, html);

    // Copy to root input/index.html
    const rootInput = path.join(process.cwd(), 'input');
    await fs.ensureDir(rootInput);
    await fs.copy(srcHtml, path.join(rootInput, 'index.html'));
    // Copy minimal assets
    for (const d of ['assets','images']){
      const s = path.join(basePath, d); if (await fs.pathExists(s)){ await fs.ensureDir(path.join(rootInput, d)); await fs.copy(s, path.join(rootInput, d), { overwrite: true }); }
    }
    // Run minimal pipeline
    const steps = [ ['node',['core/input.js']], ['node',['core/adapter-salla.js']], ['node',['core/assets.js']], ['node',['core/locales.js']], ['node',['core/export.js']] ];
    for (const [cmd,args] of steps){ const r = spawnSync(cmd,args,{ stdio:'inherit', shell: process.platform==='win32' }); if (r.status!==0) throw new Error(`Adapter step failed: ${cmd} ${args.join(' ')}`); }
    return true;
  }
}

module.exports = AdapterBridge;

