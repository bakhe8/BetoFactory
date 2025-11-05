import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('build', 'salla');
const twig = path.join(dir, 'templates', 'index.twig');
const theme = path.join(dir, 'theme.json');

if (!fs.existsSync(dir)) throw new Error('build/salla missing');
if (!fs.existsSync(twig)) throw new Error('templates/index.twig missing');
if (!fs.existsSync(theme)) throw new Error('theme.json missing');
console.log('✅ Adapter output exists');

