const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { Logger } = require('./lib/log.cjs');
const FSHelpers = require('../core/utils/fs.cjs');
const path = require('path');

class SchemaValidator {
  constructor(){
    this.ajv = new Ajv({ allErrors:true, strict:false, verbose:true });
    addFormats(this.ajv);
    this.logger = new Logger('schema-validator');
    this._compile();
  }
  _compile(){
    const schema = require('../schemas/canonical.schema.json');
    this.validateFn = this.ajv.compile(schema);
  }
  validate(data){ const valid = this.validateFn(data); return { valid, errors: this.validateFn.errors||[] }; }
  validateFile(filePath){
    try {
      const data = FSHelpers.readJsonSync(filePath);
      const res = this.validate(data);
      if (res.valid) this.logger.info(✅  is valid);
      else { this.logger.error(❌  validation failed:); (res.errors||[]).forEach(e=> this.logger.error(  -  )); }
      return res;
    } catch(e){ this.logger.error(❌  has invalid JSON: ); return { valid:false, errors:[e.message] }; }
  }
  async validateFolder(folderPath){
    if (!(await FSHelpers.exists(folderPath))) { this.logger.error(Folder does not exist: ); return { valid:false, total:0, validCount:0 }; }
    const files = await FSHelpers.readdir(folderPath);
    const json = files.filter(f=>f.endsWith('.json'));
    this.logger.info(Validating  files in );
    let validCount=0; const results=[];
    for (const f of json){ const p=path.join(folderPath,f); const r=this.validateFile(p); results.push({ file:f, valid:r.valid, errors:r.errors }); if (r.valid) validCount++; }
    return { valid: validCount===json.length, total: json.length, validCount, results }
  }
  async validateSmartInputFolder(folderName){
    const canonicalPath = path.join('smart-input','canonical', folderName);
    const fs = require('fs-extra');
    if (!(await fs.pathExists(canonicalPath))) { this.logger.error('Folder not found: ' + canonicalPath); return false; }
    const files = await fs.readdir(canonicalPath);
    const jsonFiles = files.filter(f=> f.endsWith('.json') && !f.includes('qa-summary'));
    let validCount = 0;
    for (const f of jsonFiles){ const result = this.validateFile(path.join(canonicalPath, f)); if (result.valid) validCount++; }
    this.logger.info('Smart Input Validation: ' + validCount + '/' + jsonFiles.length + ' valid files in ' + folderName);
    return validCount === jsonFiles.length;
  }
}

module.exports = new SchemaValidator();
