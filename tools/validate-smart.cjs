const path = require('path');
const validator = require('./schema-validator.cjs');

async function main(){
  const folder = process.argv[2];
  if (!folder){
    console.error('Usage: node tools/validate-smart.cjs <folderName>');
    process.exit(1);
  }
  try {
    const ok = await validator.validateSmartInputFolder(folder);
    console.log('Smart input folder', folder, 'valid:', ok);
    process.exit(ok ? 0 : 2);
  } catch (e) {
    console.error('Validation error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

if (require.main === module){ main(); }
