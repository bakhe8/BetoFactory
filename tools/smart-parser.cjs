const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');
const FSHelpers = require('../core/utils/fs.cjs');
const { Logger } = require('./lib/log.cjs');
const { HTMLParser } = require('../src/parsers/html-parser.cjs');
const ParserHelpers = require('../core/canonical-helpers.cjs');

class SmartInputParser {
  constructor(config = {}) {
    this.config = config;
    this.htmlParser = new HTMLParser();
    this.logger = new Logger('smart-parser');
    this._setupDirs();
  }
  _setupDirs(){ ['input','canonical','processing','logs'].forEach(d=>{ fs.ensureDirSync(`smart-input/${d}`); }); }
  async processDesignFolder(folderName){ const startTime = Date.now();
    const inputPath = `smart-input/input/${folderName}`;
    const outputPath = `smart-input/canonical/${folderName}`;
    const processingPath = `smart-input/processing/${folderName}`;
    if (!(await FSHelpers.exists(inputPath))) throw new Error(`Input folder does not exist: ${inputPath}`);
    this.logger.info(`Starting processing for folder: ${folderName}`);
    await FSHelpers.moveSafe(inputPath, processingPath, { overwrite: true });
    try {
      const res = await this.parseFolder(processingPath, outputPath, folderName);\n      await this._generateSallaTheme(processingPath);\n      const endTime = Date.now();\n      const processingTime = endTime - startTime;\n      const qaSummary = { folder: folderName, timestamp: new Date().toISOString(), processingTime: processingTime + 'ms', filesProcessed: res.results.length, componentsExtracted: this.countComponents(res.results), assetsFound: this.countAssets(res.results), sectionsDetected: this.countSections(res.results) };\n      this.logger.info('📊 QA Summary: ' + JSON.stringify(qaSummary, null, 2));\n      const summaryPath = path.join('smart-input','canonical', folderName, 'qa-summary.json');\n      await fs.writeJson(summaryPath, qaSummary, { spaces: 2 });
      await FSHelpers.removeSafe(processingPath);
      this.logger.success(`Completed processing for folder: ${folderName}`);
      return res;
    } catch (e){ await FSHelpers.moveSafe(processingPath, inputPath, { overwrite: true }).catch(()=>{}); this.logger.error(`Failed to process folder ${folderName}:`, e); throw e; }
  }
  async parseFolder(processingPath, outputPath, folderName){
    const files = await fs.readdir(processingPath);
    const results = [];
    for (const f of files){ if (path.extname(f).toLowerCase()==='.html'){ try { const r = await this.processHTMLFile(path.join(processingPath, f), outputPath, folderName); results.push(r);} catch(e){ this.logger.error(`Failed to process HTML file ${f}:`, e);} } }
    await this.copyAssets(processingPath, outputPath);
    return { folder: folderName, processedFiles: results.length, results };
  }
  async processHTMLFile(filePath, outputPath, folderName){
    const html = await fs.readFile(filePath, 'utf-8');
    const parsed = this.htmlParser.parse(html);
    const enhanced = this.enhanceParsing(parsed, path.basename(filePath), html);
    const outFile = path.join(outputPath, path.basename(filePath, '.html') + '.json');
    await FSHelpers.ensureDir(outputPath);
    await fs.writeJson(outFile, enhanced, { spaces: 2 });
    this.logger.info(`Processed: ${filePath} -> ${outFile}`);
    return enhanced;
  }
  enhanceParsing(parsedData, fileName, htmlContent){
    const $ = require('cheerio').load(htmlContent);
    return { ...parsedData, metadata: { sourceFile: fileName, processedAt: new Date().toISOString(), parserVersion: '2.1.0-smart' }, smartFeatures: { componentCount: parsedData.components?.length||0 } };
  }
  async copyAssets(src, dest){ const assetDirs=['assets','images','css','js','fonts']; for(const d of assetDirs){ const s=path.join(src,d); const t=path.join(dest,d); if (await FSHelpers.exists(s)){ try { await FSHelpers.copyFileSafe(s,t); this.logger.info(`Copied assets from ${s} to ${t}`);} catch(e){ this.logger.error(`Failed to copy assets from ${s}:`, e);} } } }
}

countComponents(results){ return results.reduce((count, r)=> count + ((r.components && typeof r.components==='object') ? Object.keys(r.components).length : 0), 0); }\n  countAssets(results){ return results.reduce((count, r)=> count + (r.assets && Array.isArray(r.assets.images) ? r.assets.images.length : 0), 0); }\n  countSections(results){ return results.reduce((count, r)=> count + (Array.isArray(r.sections) ? r.sections.length : 0), 0); }\n}\n\nmodule.exports = SmartInputParser; module.exports.SmartInputParser = SmartInputParser;

// Simple end-to-end bridge to existing adapter (fast mode)
SmartInputParser.prototype._generateSallaTheme = async function(processingPath){
  const files = await fs.readdir(processingPath);
  let mainHtml = files.find(f=> f.toLowerCase()==='index.html');
  if (!mainHtml){ mainHtml = files.find(f=> f.toLowerCase().endsWith('.html')); }
  if (!mainHtml){ this.logger.warn('No HTML file found for adapter generation'); return; }
  const srcHtml = path.join(processingPath, mainHtml);
  const rootInputDir = path.join(process.cwd(), 'input');
  const rootAssetsDir = path.join(rootInputDir, 'assets');
  await FSHelpers.ensureDir(rootInputDir);
  await fs.copy(srcHtml, path.join(rootInputDir, 'index.html'));
  for (const d of ['assets','images']){
    const p = path.join(processingPath, d);
    if (await FSHelpers.exists(p)){
      const dest = d === 'assets' ? rootAssetsDir : path.join(rootInputDir, d);
      await FSHelpers.ensureDir(dest);
      await fs.copy(p, dest, { overwrite: true }).catch(()=>{});
    }
  }
  const steps = [ ['node', ['core/input.js']], ['node', ['core/adapter-salla.js']], ['node', ['core/assets.js']], ['node', ['core/locales.js']], ['node', ['core/export.js']] ];
  for (const [cmd, args] of steps){
    const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: process.cwd(), shell: process.platform === 'win32' });
    if (r.status !== 0){
      const msg = 'Step failed: ' + cmd + ' ' + args.join(' ');
      throw new Error(msg);
    }
  }
  this.logger.success('Salla theme generated via existing adapter');
  try {
    const folderName = path.basename(processingPath);
    const zipSrc = path.join(process.cwd(),'build','beto-theme.zip');
    const zipDest = path.join(process.cwd(),'build', folderName + '.zip');
    if (await fs.pathExists(zipSrc)) {
      await fs.copy(zipSrc, zipDest, { overwrite: true });
      this.logger.info('Copied ZIP to ' + zipDest);
    }
  } catch(e) {
    if (this.logger.warn) this.logger.warn('Could not copy namespaced ZIP: ' + e.message);
  }

  }
if (require.main === module){
  (async () => {
    const parser = new SmartInputParser();
    const folderArg = process.argv[2];
    if (folderArg){ await parser.processDesignFolder(folderArg); process.exit(0); }
    const base = path.join('smart-input','input'); await fs.ensureDir(base); const items = await fs.readdir(base);
    for (const item of items){ const st = await fs.stat(path.join(base,item)).catch(()=>null); if (st && st.isDirectory()){ try{ await parser.processDesignFolder(item);}catch(e){ /* continue */ } } }
    process.exit(0);
  })();
}











