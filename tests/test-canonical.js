import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';

const file = path.join('canonical', 'theme.json');
if (!fs.existsSync(file)) throw new Error('canonical/theme.json missing');
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

const schemaPath = path.join('schemas', 'canonical.schema.json');
if (!fs.existsSync(schemaPath)) throw new Error('schemas/canonical.schema.json missing');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const valid = validate(json);
if (!valid) {
  const msg = ajv.errorsText(validate.errors, { separator: '\n' });
  throw new Error(`Canonical schema validation failed:\n${msg}`);
}
console.log('✅ Canonical model validates against schema');
