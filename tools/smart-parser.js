const fs = require('fs-extra');
const path = require('path');
const FSHelpers = require('../core/utils/fs.cjs');
const { Logger } = require('./lib/log');
const { HTMLParser } = require('../src/parsers/html-parser');
const HTMLExtractor = require('../core/canonical/extract');

class SmartInputParser {
  constructor(config = {}) {
    this.config = config;
    this.htmlParser = new HTMLParser();
    this.logger = new Logger('smart-parser');
    this._setupDirs();
  }
  _setupDirs(){ ['input','canonical','processing','logs'].forEach(d=>{ fs.ensureDirSync(`smart-input/${d}`); }); }
  async processDesignFolder(folderName){
    const inputPath = `smart-input/input/${folderName}`;
    const outputPath = `smart-input/canonical/${folderName}`;
    const processingPath = `smart-input/processing/${folderName}`;
    if (!(await FSHelpers.exists(inputPath))) throw new Error(`Input folder does not exist: ${inputPath}`);
    this.logger.info(`Starting processing for folder: ${folderName}`);
    await FSHelpers.moveSafe(inputPath, processingPath, { overwrite: true });
    try {
      const res = await this.parseFolder(processingPath, outputPath, folderName);
      await FSHelpers.removeSafe(processingPath);
      this.logger.success(`Completed processing for folder: ${folderName}`);
      return res;
    } catch (e){ await FSHelpers.moveSafe(processingPath, inputPath, { overwrite: true }); this.logger.error(`Failed to process folder ${folderName}:`, e); throw e; }
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
    return { ...parsedData, metadata: { sourceFile: fileName, processedAt: new Date().toISOString(), parserVersion: '2.1.0-smart' }, smartFeatures: { componentCount: parsedData.components?.length||0 }, semanticStructure: HTMLExtractor.extractSemanticStructure($) };
  }
  async copyAssets(src, dest){ const assetDirs=['assets','images','css','js','fonts']; for(const d of assetDirs){ const s=path.join(src,d); const t=path.join(dest,d); if (await FSHelpers.exists(s)){ try { await FSHelpers.copyFileSafe(s,t); this.logger.info(`Copied assets from ${s} to ${t}`);} catch(e){ this.logger.error(`Failed to copy assets from ${s}:`, e);} } } }
}

module.exports = { SmartInputParser };

