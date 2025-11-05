import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('build', 'salla');
const twigSection = path.join(dir, 'views', 'components', 'sections', 'advanced-hero.twig');
const twigHome = path.join(dir, 'views', 'pages', 'index.twig');

if (!fs.existsSync(twigSection)) throw new Error('sections/advanced-hero.twig missing');

const src = fs.readFileSync(twigSection, 'utf8');
const m = src.match(/\{\%\s*schema\s*\%\}([\s\S]*?)\{\%\s*endschema\s*\%\}/);
if (!m) throw new Error('No {% schema %} block found');
let json;
try {
  json = JSON.parse(m[1]);
} catch (e) {
  throw new Error('Invalid JSON inside schema block: ' + e.message);
}
if (!json.name || !Array.isArray(json.settings)) throw new Error('Schema missing name/settings');
if (!fs.existsSync(twigHome)) throw new Error('Home page missing to verify include');
const home = fs.readFileSync(twigHome, 'utf8');
if (!home.includes('components/sections/advanced-hero.twig')) throw new Error('Home does not include advanced-hero section');
console.log('✅ Section schema block present and valid');

