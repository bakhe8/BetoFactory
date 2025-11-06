const path = require('path');
const validator = require('./schema-validator.cjs');
const fs = require('fs-extra');

async function validateAll() {
  const base = path.join('smart-input','canonical');
  if (!(await fs.pathExists(base))) { console.log('No canonical folders to validate.'); return 0; }
  const dirs = (await fs.readdir(base, { withFileTypes: true })).filter(d=> d.isDirectory()).map(d=> d.name);
  let okAll = true;
  for (const d of dirs) { const ok = await validator.validateSmartInputFolder(d); if (!ok) okAll = false; }
  return okAll ? 0 : 2;
}

async function main(){
  const folder = process.argv[2];
  try {
    if (!folder) { const code = await validateAll(); process.exit(code); return; }
    const ok = await validator.validateSmartInputFolder(folder);
    console.log('Smart input folder', folder, 'valid:', ok);
    process.exit(ok ? 0 : 2);
  } catch (e) { console.error('Validation error:', e && e.message ? e.message : e); process.exit(1); }
}

if (require.main === module){ main(); }