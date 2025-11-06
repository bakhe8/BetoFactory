const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const path = require('path');
const fs = require('fs-extra');

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false, verbose: true });
    try { addFormats(this.ajv); } catch {}
    const schema = require('../schemas/canonical.schema.json');
    this.validateFn = this.ajv.compile(schema);
  }
  validate(data) { const valid = this.validateFn(data); return { valid, errors: this.validateFn.errors || [] }; }
  validateFile(filePath) {
    try {
      const data = fs.readJsonSync(filePath);
      const res = this.validate(data);
      if (!res.valid) {
        console.error('INVALID: ' + filePath);
        (res.errors || []).forEach(e => console.error('  - ' + (e.instancePath || '') + ' ' + (e.message || '')));
      }
      return res;
    } catch (e) {
      console.error('JSON ERROR in ' + filePath + ': ' + e.message);
      return { valid: false, errors: [e.message] };
    }
  }
  async validateSmartInputFolder(folderName) {
    const canonicalPath = path.join('smart-input', 'canonical', folderName);
    if (!(await fs.pathExists(canonicalPath))) {
      console.error('Folder not found: ' + canonicalPath);
      return false;
    }
    const files = await fs.readdir(canonicalPath);
    const skip = new Set(['qa-summary.json','assets-manifest.json','meta.json']);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !skip.has(f));
    let validCount = 0;
    for (const f of jsonFiles) { const result = this.validateFile(path.join(canonicalPath, f)); if (result.valid) validCount++; }
    console.log('Smart Input Validation: ' + validCount + '/' + jsonFiles.length + ' valid files in ' + folderName);
    return validCount === jsonFiles.length;
  }
}

module.exports = new SchemaValidator();
