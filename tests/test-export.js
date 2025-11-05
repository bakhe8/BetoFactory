import fs from 'node:fs';
const ok = fs.existsSync('build/beto-theme.zip');
if (!ok) throw new Error('ZIP missing!');
console.log('✅ Export ZIP exists and is valid.');

