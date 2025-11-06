const fs = require('fs-extra');
const path = require('path');

async function consolidate(){
  const legacyPaths = ['canonical','legacy/canonical'];
  for (const legacy of legacyPaths){
    if (!(await fs.pathExists(legacy))) continue;
    const items = await fs.readdir(legacy);
    for (const item of items){
      if (!item) continue;
      const src = path.join(legacy, item);
      const dst = path.join('smart-input','canonical', item);
      try { await fs.move(src, dst, { overwrite: true }); } catch {}
    }
  }
  console.log('Canonical consolidation complete. Use smart-input/canonical as source.');
}

if (require.main === module){ consolidate().catch(e=>{ console.error(e&&e.message?e.message:e); process.exit(1); }); }

