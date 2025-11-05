import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';

const dir = path.join('build', 'salla');
const sectionsDir = path.join(dir, 'views', 'components', 'sections');
const twigHome = path.join(dir, 'views', 'pages', 'index.twig');
const schemaPath = path.join('schemas', 'section.schema.json');

if (!fs.existsSync(sectionsDir)) throw new Error('sections directory missing');
if (!fs.existsSync(twigHome)) throw new Error('Home page missing to verify include');
if (!fs.existsSync(schemaPath)) throw new Error('section.schema.json missing');

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

const files = fs.readdirSync(sectionsDir).filter((f) => f.endsWith('.twig'));
if (files.length === 0) throw new Error('No section twig files found');
for (const f of files) {
  const src = fs.readFileSync(path.join(sectionsDir, f), 'utf8');
  const m = src.match(/\{\%\s*schema\s*\%\}([\s\S]*?)\{\%\s*endschema\s*\%\}/);
  if (!m) throw new Error(`No {% schema %} block found in ${f}`);
  let json;
  try {
    json = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`Invalid JSON inside schema block in ${f}: ${e.message}`);
  }
  const ok = validate(json);
  if (!ok) {
    const msg = ajv.errorsText(validate.errors, { separator: '\n' });
    throw new Error(`Schema validation failed for ${f}:\n${msg}`);
  }
}

const home = fs.readFileSync(twigHome, 'utf8');
['advanced-hero','configurable-banner','testimonials'].forEach((name) => {
  if (!home.includes(`components/sections/${name}.twig`)) throw new Error(`Home does not include ${name} section`);
});
console.log('✅ All section schemas valid and included on home');
