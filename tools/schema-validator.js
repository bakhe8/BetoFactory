const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { Logger } = require('./lib/log');
const FSHelpers = require('../core/utils/fs.cjs');
const path = require('path');

class SchemaValidator {
  constructor(){ this.ajv = new Ajv({ allErrors:true, strict:false, verbose:true }); addFormats(this.ajv); this.logger=new Logger('schema-validator'); this._compile(); }
  _compile(){ const schema = require('../schemas/canonical.schema.json'); this.validateFn = this.ajv.compile(schema); }, components:{ type:"array"}, assets:{ type:"object"}, metadata:{ type:"object"}, smartFeatures:{ type:"object"} }, additionalProperties:true }; this.validateFn = this.ajv.compile(schema); }
  validate(data){ const valid = this.validateFn(data); return { valid, errors: this.validateFn.errors||[] }; }
  validateFile(filePath){ try { const data = FSHelpers.readJsonSync(filePath); const res = this.validate(data); if (res.valid) this.logger.info(`✅ ${filePath} is valid`); else { this.logger.error(`❌ ${filePath} validation failed:`); (res.errors||[]).forEach(e=> this.logger.error(`  - ${e.instancePath} ${e.message}`)); } return res; } catch(e){ this.logger.error(`❌ ${filePath} has invalid JSON: ${e.message}`); return { valid:false, errors:[e.message] }; } }
  async validateFolder(folderPath){ if (!(await FSHelpers.exists(folderPath))) { this.logger.error(`Folder does not exist: ${folderPath}`); return { valid:false, total:0, validCount:0 }; } const files = await FSHelpers.readdir(folderPath); const json = files.filter(f=>f.endsWith('.json')); this.logger.info(`Validating ${json.length} files in ${folderPath}`); let validCount=0; const results=[]; for (const f of json){ const p=path.join(folderPath,f); const r=this.validateFile(p); results.push({ file:f, valid:r.valid, errors:r.errors }); if (r.valid) validCount++; } return { valid: validCount===json.length, total: json.length, validCount, results } }
}

module.exports = new SchemaValidator();


