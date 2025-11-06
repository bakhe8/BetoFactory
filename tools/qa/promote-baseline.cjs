const path = require('path');
const fs = require('fs-extra');

async function promote(theme){
  const srcDir = path.join('qa','screenshots', theme);
  const dstDir = path.join('qa','reference','screenshots', theme);
  await fs.ensureDir(dstDir);
  const files = await fs.readdir(srcDir).catch(()=>[]);
  const candidates = files.filter(f => /^current-(mobile|tablet|desktop)\.png$/i.test(f));
  for (const f of candidates){
    const bp = f.replace(/^current-/, 'baseline-');
    await fs.copy(path.join(srcDir, f), path.join(dstDir, bp), { overwrite: true });
  }
  console.log(`Promoted baseline for ${theme}: ${candidates.length} files`);
}

if (require.main === module){
  const theme = process.argv[2];
  if (!theme) { console.error('Usage: node tools/qa/promote-baseline.cjs <theme>'); process.exit(2); }
  promote(theme).catch(e=>{ console.error(e&&e.message?e.message:e); process.exit(1); });
}

