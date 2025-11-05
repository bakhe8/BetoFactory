import fs from 'node:fs';
import path from 'node:path';

const file = path.join('canonical', 'theme.json');
if (!fs.existsSync(file)) throw new Error('canonical/theme.json missing');
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!json.components || !json.components.hero) throw new Error('hero component missing');
console.log('✅ Canonical model shape looks OK');

