const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const { glob } = require('glob');

class SmartHTMLParser {
  constructor() {
    this.inputRoot = 'input';
    this.outputRoot = 'canonical';
    this.logFile = 'logs/parser.log';
    const { createLogger } = require('./lib/log.js');\n    this.logger = createLogger('PARSER', this.logFile);
  }

  setupLogging() {
    fs.ensureDirSync('logs');
  }

  log(message, level = 'INFO') {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${message}\n`;
    fs.appendFileSync(this.logFile, line);
    console.log(`📝 ${line.trim()}`);
  }

  async processAllFolders(targetFolder) {
    try {
      this.logger.info('Starting folder processing batch');
      const folders = targetFolder ? [targetFolder] : await this.getInputFolders();
      if (folders.length === 0) {
        this.logger.info('No folders found in input directory', ');
        return { processed: 0, errors: [] };
      }
      const results = { processed: 0, errors: [], details: [] };
      for (const folder of folders) {
        try {
          const detail = await this.processSingleFolder(folder);
          results.processed++;
          results.details.push(detail);
        } catch (e) {
          results.errors.push({ folder, error: e.message });
          this.logger.info(`Failed to process folder ${folder}: ${e.message}`, ');
        }
      }
      this.logger.info(`Batch processing complete: ${results.processed} successful, ${results.errors.length} failed`);
      return results;
    } catch (e) {
      this.logger.info(`Fatal error in processAllFolders: ${e.message}`, ');
      throw e;
    }
  }

  async processSingleFolder(folderName) {
    const started = Date.now();
    this.logger.info(`Processing folder: ${folderName}`);
    const folderPath = path.join(this.inputRoot, folderName);
    const outputPath = path.join(this.outputRoot, folderName);
    await this.validateInputFolder(folderPath);
    fs.ensureDirSync(outputPath);
    fs.ensureDirSync(path.join(outputPath, 'assets'));
    const htmlFiles = await this.findHTMLFiles(folderPath);
    if (htmlFiles.length === 0) throw new Error(`No HTML files found in ${folderName}`);
    const detail = { folder: folderName, htmlFiles: htmlFiles.length, generatedJSONs: 0, assetsCopied: 0, processingTime: 0 };
    for (const htmlFile of htmlFiles) {
      const res = await this.processHTMLFile(htmlFile, folderName, outputPath);
      if (res) detail.generatedJSONs++;
    }
    detail.assetsCopied = await this.copyAssets(folderPath, outputPath);
    detail.processingTime = Date.now() - started;
    this.logger.info(`✅ Completed ${folderName}: ${detail.htmlFiles} HTML → ${detail.generatedJSONs} JSON, ${detail.assetsCopied} assets`);
    return detail;
  }

  async processHTMLFile(filePath, folderName, outputPath) {
    const rel = path.relative(path.join(this.inputRoot, folderName), filePath);
    this.logger.info(`Parsing HTML: ${rel}`);
    const html = await fs.readFile(filePath, 'utf8');
    const data = this.extractCanonicalFromHTML(html, filePath);
    data.metadata = { sourceFile: rel, extractedAt: new Date().toISOString(), folder: folderName, parserVersion: '1.0.0' };
    const outName = path.basename(filePath, '.html') + '.json';
    await fs.writeJson(path.join(outputPath, outName), data, { spaces: 2 });
    this.logger.info(`Generated: ${outName}`);
    return { input: rel, output: outName };
  }

  extractCanonicalFromHTML(htmlContent, filePath) {
    const $ = cheerio.load(htmlContent);
    const canonical = {
      layout: this.extractLayoutStructure($),
      components: this.extractComponents($),
      sections: this.extractSections($),
      assets: this.extractAssets($, filePath),
      theme: { colors: {}, typography: {}, spacing: {} },
      ecommerce: {}
    };
    return canonical;
  }

  extractLayoutStructure($) {
    return {
      header: this.extractHeader($),
      footer: this.extractFooter($),
      navigation: this.extractNavigation($),
      grids: this.extractGridSystems($)
    };
  }
  extractHeader($) {
    const sel = ['header', '.header', '#header', '[role="banner"]', '.navbar', '.nav-bar', '.main-header'];
    const el = this.findFirstMatching($, sel);
    if (!el) return null;
    return {
      type: 'header',
      content: {
        logo: el.find('img[alt*="logo" i], .logo img').attr('src') || null,
        navigation: this.extractHeaderNavigation($, el),
        search: !!el.find('input[type="search"], .search').length,
        cart: !!el.find('.cart, [data-cart], .icon-cart').length,
        user: !!el.find('.user, .account, [data-user]').length
      }
    };
  }
  extractHeaderNavigation($, el) {
    try {
      return el.find('nav a')
        .map((i, a) => $(a).text().trim())
        .get()
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }
  extractFooter($) {
    const el = this.findFirstMatching($, ['footer', '.footer', '#footer', '[role="contentinfo"]']);
    if (!el) return null;
    return { type: 'footer', sections: el.find('section, .column, .widget').length || 0 };
  }
  extractNavigation($) { return { items: $('nav a').map((i, a) => $(a).text().trim()).get().filter(Boolean).slice(0, 20) }; }
  extractGridSystems($) { return { containers: $('.container, .grid, [class*="grid-"]').length }; }

  extractComponents($) {
    const components = [];
    $('.product-grid, .products-grid, [data-products]').each((i, el) => components.push(this.extractProductGrid($, $(el))));
    $('.hero, .banner, .hero-banner, .slider').each((i, el) => components.push(this.extractHeroBanner($, $(el))));
    $('.search, .search-form, [role="search"]').each((i, el) => components.push({ type: 'search-form' }));
    return components;
  }
  extractProductGrid($, el) {
    const products = [];
    el.find('.product, .product-card, .item').each((i, p) => {
      const $p = $(p);
      products.push({
        name: $p.find('h1,h2,h3,h4,.name,.title').first().text().trim() || null,
        price: $p.find('.price,[data-price]').first().text().trim() || null,
        image: $p.find('img').attr('src') || null
      });
    });
    return { type: 'product-grid', layout: el.attr('class') || '', products };
  }
  extractHeroBanner($, el) {
    return { type: 'hero', content: { title: el.find('h1,h2').first().text().trim() || null, subtitle: el.find('p,small').first().text().trim() || null } };
  }
  extractSections($) { return []; }

  extractAssets($, filePath) {
    const baseDir = path.dirname(filePath);
    const images = [];
    $('img').each((i, img) => { const src = $(img).attr('src'); if (src && !src.startsWith('data:')) images.push(this.normalizeAssetPath(src, filePath)); });
    const styles = $('link[rel="stylesheet"]').map((i, l) => $(l).attr('href')).get().filter(Boolean).map(h => this.normalizeAssetPath(h, filePath));
    const scripts = $('script[src]').map((i, s) => $(s).attr('src')).get().filter(Boolean).map(s => this.normalizeAssetPath(s, filePath));
    return { images, styles, scripts };
  }

  normalizeAssetPath(assetPath, filePath) {
    if (!assetPath) return assetPath;
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    const base = path.dirname(filePath);
    return path.normalize(path.join(base, assetPath)).replace(/\\/g, '/');
  }

  async getInputFolders() {
    try {
      const items = await fs.readdir(this.inputRoot, { withFileTypes: true });
      return items.filter(d => d.isDirectory()).map(d => d.name).filter(n => !n.startsWith('.'));
    } catch (e) {
      this.logger.info(`Error reading input directory: ${e.message}`, ');
      return [];
    }
  }
  async findHTMLFiles(folderPath) {
    // Ensure forward slashes for glob patterns on Windows
    const base = folderPath.replace(/\\/g, '/');
    const pattern = base.endsWith('/') ? base + '**/*.html' : base + '/**/*.html';
    return await glob(pattern, { ignore: ['**/node_modules/**', '**/.*'] });
  }
  async copyAssets(sourcePath, destPath) {
    const assetDirs = ['assets', 'images', 'img', 'css', 'js', 'fonts'];
    let count = 0;
    for (const dir of assetDirs) {
      const src = path.join(sourcePath, dir); const dest = path.join(destPath, 'assets', dir);
      if (await fs.pathExists(src)) { await fs.copy(src, dest); const files = await fs.readdir(src); count += files.length; this.logger.info(`Copied ${files.length} files from ${dir}`); }
    }
    return count;
  }
  validateInputFolder(folderPath) {
    if (!fs.existsSync(folderPath)) throw new Error(`Folder does not exist: ${folderPath}`);
    const files = fs.readdirSync(folderPath); if (files.length === 0) throw new Error(`Folder is empty: ${folderPath}`);
  }
  findFirstMatching($, selectors) { for (const s of selectors) { const el = $(s).first(); if (el.length > 0) return el; } return null; }
  extractNavigation() { return {}; }
  extractGridSystems() { return {}; }
}

module.exports = new SmartHTMLParser();

if (require.main === module) {
  const parser = new SmartHTMLParser();
  const folderArg = process.argv[2];
  parser.processAllFolders(folderArg)
    .then(res => {
      console.log('\n🎉 Processing Summary:');
      console.log(`✅ Processed: ${res.processed} folders`);
      console.log(`❌ Errors: ${res.errors.length} folders`);
      if (res.errors.length) process.exit(1); else process.exit(0);
    })
    .catch(err => { console.error('💥 Fatal error:', err); process.exit(1); });
}

