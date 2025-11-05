import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils/fs.js';

const root = process.cwd();
const outDir = path.join(root, 'build', 'salla', 'locales');

function main() {
  ensureDir(outDir);
  const en = {
    hero: { title: 'Welcome' },
    footer: { copyright: 'All rights reserved.' }
  };
  const ar = {
    hero: { title: 'مرحبا' },
    footer: { copyright: 'جميع الحقوق محفوظة.' }
  };
  fs.writeFileSync(path.join(outDir, 'en.json'), JSON.stringify(en, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'ar.json'), JSON.stringify(ar, null, 2), 'utf8');
  console.log('✅ Locales written (en/ar)');
}

main();
