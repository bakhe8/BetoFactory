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
    // Support both fast-mode path and legacy root input path
    const fastInputPath = `smart-input/input/${folderName}`;
    const legacyInputPath = path.join('input', folderName);
    const inputPath = (await FSHelpers.exists(fastInputPath)) ? fastInputPath : legacyInputPath;
    const outputPath = `smart-input/canonical/${folderName}`;
    const processingPath = `smart-input/processing/${folderName}`;
    if (!(await FSHelpers.exists(inputPath))) throw new Error(`Input folder does not exist: ${inputPath}`);
    this.logger.info(`Starting processing for folder: ${folderName}`);
    const consume = String(process.env.SMART_PARSER_CONSUME_INPUT || 'true').toLowerCase() !== 'false';
    if (consume) {
      await FSHelpers.moveSafe(inputPath, processingPath, { overwrite: true });
    } else {
      await fs.remove(processingPath).catch(()=>{});
      await fs.copy(inputPath, processingPath, { overwrite: true });
    }
    try {
      // Compute quick signature of input directory to short-circuit unchanged work
      const computeSig = async (dir) => {
        const crypto = require('crypto');
        const h = crypto.createHash('sha1');
        async function walk(d){
          const items = await fs.readdir(d);
          for (const it of items){
            const p = path.join(d,it);
            const st = await fs.stat(p);
            if (st.isDirectory()) await walk(p); else { h.update(path.relative(dir,p)); h.update(String(st.size)); h.update(String(st.mtimeMs)); }
          }
        }
        await walk(dir);
        return h.digest('hex');
      };
      const sig = await computeSig(processingPath);
      const existingMetaPath = path.join('smart-input','canonical', folderName, 'meta.json');
      let existingSig = null;
      try { const m = await fs.readJson(existingMetaPath); existingSig = m && (m.lastInputSignature || m.inputSignature); } catch {}
      const forceRebuild = String(process.env.SMART_FORCE_REBUILD||'false').toLowerCase()==='true';
      let res;
      if (!forceRebuild && existingSig && existingSig === sig) {
        // Skip heavy parse; reuse existing canonical files
        this.logger.info(`Input unchanged (signature match); reusing canonical for ${folderName}`);
        res = { folder: folderName, processedFiles: 0, results: [] };
      } else {
        res = await this.parseFolder(processingPath, outputPath, folderName);
      }
      const res = await this.parseFolder(processingPath, outputPath, folderName);
      // Resolve safe output names and write consolidated canonical under smart-input/canonical/<folder>/theme.json
      const conflictResolver = require('./conflict-resolver.cjs');
      const { canonicalName, buildName } = conflictResolver.ensureSafeOutput(folderName);
      const desiredCanonicalDir = path.join('smart-input','canonical', canonicalName);
      try {
        const consolidated = Array.isArray(res.results) && res.results.length ? res.results[0] : {};
        await FSHelpers.ensureDir(desiredCanonicalDir);
        const themePath = path.join(desiredCanonicalDir, 'theme.json');
        await fs.writeJson(themePath, consolidated, { spaces: 2 });
        this.logger.info(`Wrote consolidated canonical: ${themePath}`);
        // Also write metadata summary
        const metaSummary = {
          title: consolidated.meta && consolidated.meta.title || null,
          tags: consolidated.meta && consolidated.meta.tags || {},
          schemaCount: consolidated.meta && Array.isArray(consolidated.meta.schema) ? consolidated.meta.schema.length : 0,
          generatedAt: new Date().toISOString(),
          lastInputSignature: sig
        };
        await fs.writeJson(path.join(desiredCanonicalDir, 'meta.json'), metaSummary, { spaces: 2 });
      } catch (e) {
        this.logger.warn('Failed to write consolidated canonical theme.json: ' + (e && e.message ? e.message : e));
      }
      // Pre-adapter schema validation
      const validator = require('./schema-validator.cjs');
      const valid = await validator.validateSmartInputFolder(folderName);
      if (!valid) {
        await this._logFailure(folderName, 'schema', 'Canonical schema validation failed');
        throw new Error('Schema validation failed');
      }
      // Run adapters (Phase 8: adapter manager; default to Salla only)
      const platforms = (process.env.SMART_PLATFORMS || 'salla').split(',').map(s=>s.trim()).filter(Boolean);
      try {
        const outs = await this._generateThemes(processingPath, desiredCanonicalDir, platforms);
        const outSalla = outs.find(o=>o && o.platform==='salla' && o.out && o.out.themeOutputDir);
        if (outSalla) {
          const out = outSalla.out;
          const actualName = path.basename(out.themeOutputDir);
          if (actualName !== buildName) {
            try {
              const desiredDir = path.join('build','salla-themes', buildName);
              await fs.remove(desiredDir).catch(()=>{});
              await fs.move(out.themeOutputDir, desiredDir, { overwrite: true });
              if (out.zipPath) {
                const desiredZip = path.join('build','salla-themes', `${buildName}.zip`);
                await fs.remove(desiredZip).catch(()=>{});
                await fs.move(out.zipPath, desiredZip, { overwrite: true });
              }
              this.logger.info(`Renamed build output to avoid conflict: ${actualName} → ${buildName}`);
            } catch (renErr) {
              this.logger.warn('Post-build rename failed: ' + (renErr && renErr.message ? renErr.message : renErr));
            }
          }
        }
      } catch (e) {
        await this._logFailure(folderName, 'adapter', e && e.message ? e.message : String(e));
        throw e;
      }
      // Optional post Twig validation (best-effort)
      await this._validateTwig().catch(async (e)=>{
        await this._logFailure(folderName, 'twig', e && e.message ? e.message : String(e));
      });
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const canonicalOut = path.join('smart-input','canonical', folderName);
      const listFrom = (arr) => Array.isArray(arr) ? arr : [];
      const flatten = (key) => res.results.flatMap(r => listFrom(r.assets && r.assets[key]));
      const imgs = flatten('images');
      const csss = flatten('styles');
      const jss = flatten('scripts');
      const invalid = [];
      for (const rel of [...imgs, ...csss, ...jss]){
        if (!rel) continue;
        if (/^https?:\/\//i.test(rel) || rel.startsWith('//') || /^data:/i.test(rel)) continue;
        const safe = rel.replace(/\\/g,'/').replace(/^\.\//,'');
        const exists = await fs.pathExists(path.join(canonicalOut, safe));
        if (!exists) invalid.push(safe);
      }
      const qaSummary = {
        folder: folderName,
        timestamp: new Date().toISOString(),
        processingTime: processingTime + 'ms',
        filesProcessed: res.results.length,
        componentsExtracted: this.countComponents(res.results),
        sectionsDetected: this.countSections(res.results),
        imagesCount: this.countAssets(res.results),
        stylesCount: this.countStyles(res.results),
        scriptsCount: this.countScripts(res.results),
        assetsFound: (this.countAssets(res.results) + this.countStyles(res.results) + this.countScripts(res.results)),
        normalizedAssets: { images: imgs.length, styles: csss.length, scripts: jss.length },
        invalidRefs: Array.from(new Set(invalid))
      };
      this.logger.info('📊 QA Summary: ' + JSON.stringify(qaSummary, null, 2));
      const summaryPath = path.join('smart-input','canonical', folderName, 'qa-summary.json');
      await fs.writeJson(summaryPath, qaSummary, { spaces: 2 });
      await FSHelpers.removeSafe(processingPath);
      this.logger.success(`Completed processing for folder: ${folderName}`);
      return res;
    } catch (e){ await FSHelpers.moveSafe(processingPath, inputPath, { overwrite: true }).catch(()=>{}); this.logger.error(`Failed to process folder ${folderName}:`, e); throw e; }
  }
  async parseFolder(processingPath, outputPath, folderName){
    const files = await fs.readdir(processingPath);
    const results = [];
    for (const f of files){ if (path.extname(f).toLowerCase()==='.html'){ try { const r = await this.processHTMLFile(path.join(processingPath, f), outputPath, folderName, processingPath); results.push(r);} catch(e){ this.logger.error(`Failed to process HTML file ${f}:`, e);} } }
    await this.copyAssets(processingPath, outputPath);
    return { folder: folderName, processedFiles: results.length, results };
  }
  async processHTMLFile(filePath, outputPath, folderName, processingRoot){
    const html = await fs.readFile(filePath, 'utf-8');
    const parsed = this.htmlParser.parse(html);
    const enhanced = this.enhanceParsing(parsed, path.basename(filePath), html, filePath, processingRoot);
    // Extract basic styles info from linked CSS files (colors, fonts)
    try {
      const $ = require('cheerio').load(html);
      const hrefs = $('link[rel="stylesheet"]').map((i, l)=> $(l).attr('href')).get().filter(Boolean);
      const baseDir = path.dirname(filePath);
      const colors = new Set();
      const fonts = new Set();
      const cssVars = {};
      const hexColor = /#([0-9a-fA-F]{3,8})\b/g;
      const rgbColor = /rgb[a]?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0?\.\d+|1(?:\.0+)?))?\s*\)/g;
      const hslColor = /hsl[a]?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(?:\s*,\s*(?:0?\.\d+|1(?:\.0+)?))?\s*\)/g;
      const fontFamily = /font-family\s*:\s*([^;}{]+);/gi;
      const fontFace = /@font-face/gi;
      const varDecl = /--([a-zA-Z0-9_-]+)\s*:\s*([^;}{]+);/g;
      const importRe = /@import\s+url\(([^)]+)\)|@import\s+['\"]([^'\"]+)['\"]/gi;

      const visited = new Set();
      const readCssRecursive = async (file) => {
        const norm = path.normalize(file);
        if (visited.has(norm)) return '';
        visited.add(norm);
        const css = await fs.readFile(norm, 'utf8').catch(()=>null);
        if (!css) return '';
        // Handle imports
        let out = css;
        let m;
        while ((m = importRe.exec(css))) {
          const imp = (m[1] || m[2] || '').replace(/^['\"]|['\"]$/g,'');
          if (!imp) continue;
          if (/^https?:\/\//i.test(imp) || imp.startsWith('//')) continue;
          const impPath = path.isAbsolute(imp) ? path.join(process.cwd(), imp) : path.join(path.dirname(norm), imp);
          out += '\n' + await readCssRecursive(impPath);
        }
        return out;
      };

      const addFromCss = (css) => {
        let m;
        while ((m = hexColor.exec(css))) colors.add(`#${m[1]}`.toLowerCase());
        while ((m = rgbColor.exec(css))) colors.add(m[0]);
        while ((m = hslColor.exec(css))) colors.add(m[0]);
        while ((m = fontFamily.exec(css))) {
          const fams = m[1].split(',').map(s=> s.trim().replace(/^['"]|['"]$/g,''));
          fams.forEach(f=> { if (f) fonts.add(f); });
        }
        if (fontFace.test(css)) fonts.add('font-face');
        while ((m = varDecl.exec(css))) {
          const name = m[1]; const val = m[2].trim();
          // Only keep color-like values or references
          if (/#|rgb|hsl|var\(/i.test(val)) cssVars[name] = val;
        }
      };

      // Linked stylesheets
      for (const href of hrefs){
        if (/^https?:\/\//i.test(href) || href.startsWith('//')) continue;
        const localPath = path.normalize(path.isAbsolute(href) ? path.join(process.cwd(), href) : path.join(baseDir, href));
        if (await FSHelpers.exists(localPath)){
          const fullCss = await readCssRecursive(localPath);
          if (fullCss) addFromCss(fullCss);
        }
      }
      // Inline <style> blocks
      $('style').each((i, el) => { const css = $(el).text(); if (css) addFromCss(css); });

      enhanced.meta = enhanced.meta || {};
      enhanced.meta.styles = {
        colors: Array.from(colors).slice(0, 128),
        fonts: Array.from(fonts).slice(0, 64),
        cssVars
      };
    } catch {}
    const outFile = path.join(outputPath, path.basename(filePath, '.html') + '.json');
    await FSHelpers.ensureDir(outputPath);
    await fs.writeJson(outFile, enhanced, { spaces: 2 });
    this.logger.info(`Processed: ${filePath} -> ${outFile}`);
    return enhanced;
  }
  enhanceParsing(parsedData, fileName, htmlContent, fileAbsolutePath, processingRoot){
    const $ = require('cheerio').load(htmlContent);
    const base = {
      layout: { header: 'default', footer: 'default' },
      components: {},
      assets: { images: [], styles: [], scripts: [] },
    };
    const merged = {
      ...base,
      ...parsedData,
      metadata: { sourceFile: fileName, processedAt: new Date().toISOString(), parserVersion: '2.1.0-smart' },
      smartFeatures: { componentCount: (parsedData.components && typeof parsedData.components==='object' ? Object.keys(parsedData.components).length : 0) }
    };
    // Normalize to satisfy schema
    if (!merged.layout || typeof merged.layout !== 'object') merged.layout = { header:'default', footer:'default' };
    if (!merged.layout.header) merged.layout.header = 'default';
    if (!merged.layout.footer) merged.layout.footer = 'default';
    if (!merged.components || typeof merged.components !== 'object' || Array.isArray(merged.components)) merged.components = {};
    if (!merged.assets || typeof merged.assets !== 'object' || Array.isArray(merged.assets)) merged.assets = { images: [], styles: [], scripts: [] };
    if (!Array.isArray(merged.assets.images)) merged.assets.images = [];
    if (!Array.isArray(merged.assets.styles)) merged.assets.styles = [];
    if (!Array.isArray(merged.assets.scripts)) merged.assets.scripts = [];
    // Extract page meta
    const pageTitle = ($('title').first().text() || '').trim();
    const metaTags = {};
    $('meta[name], meta[property]').each((i, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) metaTags[name] = content;
    });
    const schemaScripts = [];
    $('script[type="application/ld+json"]').each((i, el) => {
      try { const json = JSON.parse($(el).text()); schemaScripts.push(json); } catch {}
    });
    // Normalize JSON-LD entities
    const norm = { organizations: [], products: [] };
    const pushOrg = (obj) => {
      if (!obj) return;
      const logo = obj && obj.logo && (typeof obj.logo === 'string' ? obj.logo : (obj.logo.url || null));
      norm.organizations.push({ name: obj.name || null, url: obj.url || null, logo: logo || null });
    };
    const pushProduct = (obj) => {
      if (!obj) return;
      const brand = obj.brand && (typeof obj.brand === 'string' ? obj.brand : (obj.brand.name || null));
      let price = null, priceCurrency = null;
      if (obj.offers) {
        const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
        if (offers) { price = offers.price || offers.priceAmount || null; priceCurrency = offers.priceCurrency || null; }
      }
      const image = Array.isArray(obj.image) ? obj.image[0] : obj.image;
      norm.products.push({ name: obj.name || null, sku: obj.sku || null, brand: brand || null, image: image || null, price, priceCurrency });
    };
    const eachSchema = (node) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(eachSchema); return; }
      const t = node['@type'];
      if (t === 'Organization' || (Array.isArray(t) && t.includes('Organization'))) pushOrg(node);
      if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) pushProduct(node);
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(eachSchema);
    };
    schemaScripts.forEach(eachSchema);
    merged.meta = { title: pageTitle, tags: metaTags, schema: schemaScripts, normalized: norm };

    // Helper to resolve asset refs to canonical-relative paths
    const resolveToCanonical = (ref, baseDir) => {
      if (!ref || typeof ref !== 'string') return ref;
      const external = /^https?:\/\//i.test(ref) || ref.startsWith('//') || /^data:/i.test(ref);
      if (external) return ref;
      const isRoot = ref.startsWith('/');
      const abs = isRoot
        ? path.normalize(path.join(processingRoot || '', ref.replace(/^\//, '')))
        : path.normalize(path.join(baseDir || path.dirname(fileAbsolutePath || ''), ref));
      if (!processingRoot) return ref;
      let rel = path.relative(processingRoot, abs);
      rel = rel.replace(/\\/g, '/');
      // keep within processing root; otherwise fall back to normalized original
      if (rel.startsWith('..')) return ref.replace(/\\/g,'/');
      return rel;
    };

    // Collect CSS url(...) references from linked stylesheets (model-only, sync scan) with proper base resolution
    try {
      const hrefs = [];
      $('link[rel="stylesheet"]').each((_, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (href) hrefs.push(href);
      });
      const visited = new Set();
      const collectedFromCss = [];
      const readCssRecursiveSync = (absPath) => {
        const norm = path.normalize(absPath);
        if (visited.has(norm)) return '';
        visited.add(norm);
        try {
          const css = fs.readFileSync(norm, 'utf-8');
          const imports = Array.from(css.matchAll(/@import\s+(?:url\()?['"]?([^'"\)\n]+)['"]?\)?\s*;/gi)).map(m=>m[1]);
          let bundled = css;
          // Collect url(...) refs for this CSS file against its own base dir
          const baseDir = path.dirname(norm);
          for (const m of css.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi)){
            const raw = (m[1] || '').trim();
            if (!raw || /^data:/i.test(raw)) continue;
            const resolved = resolveToCanonical(raw, baseDir);
            collectedFromCss.push(resolved);
          }
          for (const imp of imports){
            if (/^https?:\/\//i.test(imp) || imp.startsWith('//')) continue;
            const impAbs = path.normalize(path.isAbsolute(imp) ? imp : path.join(path.dirname(norm), imp));
            bundled += "\n" + readCssRecursiveSync(impAbs);
          }
          return bundled;
        } catch { return ''; }
      };
      const cssBundle = [];
      for (const href of hrefs){
        if (/^https?:\/\//i.test(href) || href.startsWith('//')) continue;
        // Resolve href relative to HTML file directory
        const htmlDir = path.dirname(fileAbsolutePath || '');
        const abs = path.normalize(path.isAbsolute(href) ? path.join(process.cwd(), href) : path.join(htmlDir, href));
        const content = readCssRecursiveSync(abs);
        if (content) cssBundle.push(content);
      }
      if (collectedFromCss.length){
        if (!Array.isArray(merged.assets.images)) merged.assets.images = [];
        merged.assets.images.push(...collectedFromCss);
      }
    } catch {}

    // Collect and resolve asset refs from HTML tags
    try {
      const htmlDir = path.dirname(fileAbsolutePath || '');
      // <img src>
      $('img[src]').each((_, el) => {
        const src = ($(el).attr('src') || '').trim();
        if (!src) return;
        const resolved = resolveToCanonical(src, htmlDir);
        merged.assets.images.push(resolved);
      });
      // <link href> (stylesheets and icons)
      $('link[href]').each((_, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (!href) return;
        const rel = (($(el).attr('rel') || '').toLowerCase());
        const resolved = resolveToCanonical(href, htmlDir);
        if (rel.includes('stylesheet')) {
          merged.assets.styles.push(resolved);
        } else {
          merged.assets.images.push(resolved);
        }
      });
      // <script src>
      $('script[src]').each((_, el) => {
        const src = ($(el).attr('src') || '').trim();
        if (!src) return;
        const resolved = resolveToCanonical(src, htmlDir);
        merged.assets.scripts.push(resolved);
      });
    } catch {}

    // Normalize asset references (forward slashes, remove leading ./, compact paths)
    const normalizeRef = (p) => {
      if (!p || typeof p !== 'string') return p;
      let v = p.replace(/\\/g, '/');
      if (v.startsWith('./')) v = v.slice(2);
      // compact duplicate slashes
      v = v.replace(/\/+/g, '/');
      // avoid absolute http(s)
      if (/^https?:\/\//i.test(v) || v.startsWith('//')) return v;
      // basic posix normalize without attempting to resolve against cwd
      try {
        const posix = require('path').posix;
        v = posix.normalize(v);
      } catch {}
      return v;
    };
    if (merged.assets && Array.isArray(merged.assets.images)) merged.assets.images = Array.from(new Set(merged.assets.images.map(normalizeRef)));
    if (merged.assets && Array.isArray(merged.assets.styles)) merged.assets.styles = Array.from(new Set(merged.assets.styles.map(normalizeRef)));
    if (merged.assets && Array.isArray(merged.assets.scripts)) merged.assets.scripts = Array.from(new Set(merged.assets.scripts.map(normalizeRef)));

    return merged;
  }
  async copyAssets(src, dest){
    const fsx = require('fs-extra');
    const copied = [];
    const copyRel = async (relPath) => {
      const s = path.join(src, relPath);
      const t = path.join(dest, relPath);
      if (await FSHelpers.exists(s)){
        await FSHelpers.copyFileSafe(s, t);
        copied.push(relPath.replace(/\\/g,'/'));
      }
    };
    // Known asset roots
    const assetDirs=['assets','images','css','js','fonts','static','media','vendor'];
    for (const d of assetDirs){
      await copyRel(d).catch(e=> this.logger.error(`Failed to copy assets from ${path.join(src,d)}:`, e));
    }
    // Fallback: copy any non-HTML files/directories at root
    const entries = await fsx.readdir(src);
    for (const name of entries){
      if (name.toLowerCase().endsWith('.html')) continue;
      if (assetDirs.includes(name)) continue;
      await copyRel(name).catch(e=> this.logger.error(`Failed to copy extra asset ${name}:`, e));
    }
    // Write asset manifest under canonical output
    try {
      await fs.writeJson(path.join(dest, 'assets-manifest.json'), { copied, generatedAt: new Date().toISOString() }, { spaces: 2 });
    } catch {}
  }
  countComponents(results){ return results.reduce((count, r)=> count + ((r.components && typeof r.components==='object') ? Object.keys(r.components).length : 0), 0); }
  countAssets(results){ return results.reduce((count, r)=> count + (r.assets && Array.isArray(r.assets.images) ? r.assets.images.length : 0), 0); }
  countStyles(results){ return results.reduce((count, r)=> count + (r.assets && Array.isArray(r.assets.styles) ? r.assets.styles.length : 0), 0); }
  countScripts(results){ return results.reduce((count, r)=> count + (r.assets && Array.isArray(r.assets.scripts) ? r.assets.scripts.length : 0), 0); }
  countSections(results){ return results.reduce((count, r)=> count + (Array.isArray(r.sections) ? r.sections.length : 0), 0); }
}

module.exports = SmartInputParser; module.exports.SmartInputParser = SmartInputParser;

// Helper to allow other tools to process a single folder via this parser
module.exports.processThemeFolder = async function(folderName){
  const parser = new SmartInputParser();
  return parser.processDesignFolder(folderName);
}

// Simple end-to-end bridge to existing adapter (fast mode)
SmartInputParser.prototype._generateSallaTheme = async function(processingPath, overrideCanonicalDir){
  // Use namespaced adapter to generate build/salla-themes/<folder>/ and zip
  const folderName = path.basename(processingPath);
  // Prefer root canonical/<folder> if present, else fallback to smart-input canonical
  const canonicalDir = overrideCanonicalDir || path.join('smart-input','canonical', folderName);
  const exists = await fs.pathExists(canonicalDir);
  if (!exists) {
    this.logger.warn('Canonical directory not found for adapter: ' + canonicalDir);
    return;
  }
  try {
    const SallaAdapter = require('../adapters/salla/index.cjs');
    const adapter = new SallaAdapter();
    const out = await adapter.generateFromCanonical(canonicalDir);
    this.logger.success('Salla theme generated (namespaced) at ' + out.themeOutputDir);
    return out;
  } catch (e) {
    this.logger.error('Adapter generation failed: ' + (e && e.message ? e.message : e));
    throw e;
  }
}

// Phase 8: multi-platform adapter generation using AdapterManager
SmartInputParser.prototype._generateThemes = async function(processingPath, overrideCanonicalDir, platforms){
  const AdapterManager = require('../core/adapter-manager.cjs');
  const mgr = new AdapterManager();
  const folderName = path.basename(processingPath);
  const canonicalDir = overrideCanonicalDir || path.join('smart-input','canonical', folderName);
  const exists = await fs.pathExists(canonicalDir);
  if (!exists) {
    this.logger.warn('Canonical directory not found for adapter: ' + canonicalDir);
    return [];
  }
  const outs = [];
  for (const pf of platforms){
    try {
      const out = await mgr.generate(pf, canonicalDir);
      this.logger.success(`${pf} theme generated at ${out && out.themeOutputDir ? out.themeOutputDir : '(no path reported)'}`);
      outs.push({ platform: pf, out });
    } catch (e) {
      this.logger.error(`Adapter generation failed for ${pf}: ${e && e.message ? e.message : e}`);
      outs.push({ platform: pf, error: e });
    }
  }
  return outs;
}

SmartInputParser.prototype._validateTwig = async function(){
  const { spawnSync } = require('child_process');
  // Run Salla CLI validation and lint if available; do not throw on failure, return error message
  const steps = [ ['node',['core/salla-cli.js','theme','validate']], ['node',['core/salla-cli.js','theme','lint']] ];
  for (const [cmd,args] of steps){
    const r = spawnSync(cmd, args, { stdio:'inherit', shell: process.platform==='win32' });
    if (r.status !== 0) throw new Error(`Salla CLI ${args.join(' ')} failed`);
  }
};

SmartInputParser.prototype._logFailure = async function(folderName, stage, message){
  try {
    const dir = 'logs/failed';
    await fs.ensureDir(dir);
    const stamp = new Date().toISOString().replace(/[:]/g,'-');
    const file = `${folderName}-${stage}-${stamp}.json`;
    const payload = { folder: folderName, stage, message, timestamp: new Date().toISOString() };
    await fs.writeJson(require('path').join(dir, file), payload, { spaces: 2 });
    this.logger.warn(`Recorded failure: ${stage} → ${file}`);
  } catch {}
};
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















