const fs = require('fs-extra');
const path = require('path');
const Ajv = require('ajv'); const ajv = new Ajv();

class SchemaValidator {
  constructor() {
    this.canonicalSchema = this.loadCanonicalSchema();
    this.validateCanonical = ajv.compile(this.canonicalSchema); this.setupLogging();
  }
  setupLogging() { fs.ensureDirSync('logs'); }
  log(message, level = 'INFO') {
    const ts = new Date().toISOString();
    const line = `[${ts}] [VALIDATOR] ${message}\n`;
    fs.appendFileSync('logs/validator.log', line);
    console.log(`🔍 ${message}`);
  }
  loadCanonicalSchema() {
    return {
      type: 'object',
      required: ['layout', 'components', 'assets'],
      properties: {
        metadata: {
          type: 'object',
          required: ['sourceFile', 'extractedAt'],
          properties: {
            sourceFile: { type: 'string' },
            extractedAt: { type: 'string' },
            folder: { type: 'string' },
            parserVersion: { type: 'string' }
          }
        },
        layout: { type: 'object' },
        components: { type: 'array' },
        assets: { type: 'object', required: ['images'], properties: { images: { type: 'array' }, styles: { type: 'array' }, scripts: { type: 'array' } } }
      }
    };
  }
  async validateAllCanonicalFiles() {
    this.log('Starting validation of all canonical files');
    const folders = await this.getCanonicalFolders();
    const results = { totalFolders: folders.length, validFolders: 0, invalidFolders: [], details: {} };
    for (const folder of folders) {
      const detail = await this.validateFolder(folder);
      results.details[folder] = detail;
      if (detail.validFiles === detail.totalFiles) results.validFolders++; else results.invalidFolders.push({ folder, valid: detail.validFiles, total: detail.totalFiles });
    }
    this.log(`Validation complete: ${results.validFolders}/${results.totalFolders} folders fully valid`);
    return results;
  }
  async validateFolder(folderName) {
    const folderPath = path.join('canonical', folderName);
    const jsonFiles = await this.findJSONFiles(folderPath);
    const res = { folder: folderName, totalFiles: jsonFiles.length, validFiles: 0, invalidFiles: [], validationDetails: [] };
    for (const file of jsonFiles) {
      try {
        const ok = await this.validateJSONFile(file);
        res.validationDetails.push({ file: path.basename(file), valid: ok, errors: ok ? [] : this.getValidationErrors() });
        if (ok) res.validFiles++; else res.invalidFiles.push(path.basename(file));
      } catch (e) {
        res.validationDetails.push({ file: path.basename(file), valid: false, errors: [e.message] });
        res.invalidFiles.push(path.basename(file));
      }
    }
    return res;
  }
  async validateJSONFile(filePath) {
    const data = await fs.readJson(filePath);
    const ok = this.validateCanonical(data); if (!ok) { this.validationErrors = this.validateCanonical.errors; this.log(`Invalid JSON schema in ${filePath}: ${ajv.errorsText(validate.errors)}`, 'WARN'); }
    else this.log(`✅ Valid: ${path.basename(filePath)}`);
    return ok;
  }
  getValidationErrors() { return this.validationErrors || []; }
  async getCanonicalFolders() {
    try { return (await fs.readdir('canonical', { withFileTypes: true })).filter(i => i.isDirectory()).map(d => d.name); } catch { return []; }
  }
  async findJSONFiles(folderPath) { try { return (await fs.readdir(folderPath)).filter(f => f.endsWith('.json')).map(f => path.join(folderPath, f)); } catch (e) { throw new Error(`Cannot read folder ${folderPath}: ${e.message}`); } }
}

if (require.main === module) {
  const v = new SchemaValidator();
  v.validateAllCanonicalFiles()
    .then(r => {
      console.log('\n📊 Validation Report:');
      console.log(`✅ Fully valid folders: ${r.validFolders}/${r.totalFolders}`);
      if (r.invalidFolders.length) {
        console.log('\n❌ Issues found:');
        r.invalidFolders.forEach(f => console.log(`  - ${f.folder}: ${f.valid}/${f.total} valid files`));
        process.exit(1);
      } else { console.log('🎉 All folders are fully valid!'); process.exit(0); }
    })
    .catch(e => { console.error('💥 Validation failed:', e); process.exit(1); });
}

module.exports = SchemaValidator;


