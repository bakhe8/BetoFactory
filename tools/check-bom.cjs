#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

const exts = new Set(['.json','.js','.cjs','.jsx','.md','.yml','.yaml']);
let found = [];

async function scan(dir){
  const entries = await fs.readdir(dir);
  for (const e of entries){
    const p = path.join(dir, e);
    const st = await fs.stat(p);
    if (st.isDirectory()) { if (e !== 'node_modules' && e !== '.git') await scan(p); }
    else {
      const ext = path.extname(e).toLowerCase();
      if (!exts.has(ext)) continue;
      const buf = await fs.readFile(p);
      if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        found.push(p);
      }
    }
  }
}

(async () => {
  await scan(process.cwd());
  if (found.length) {
    console.warn('BOM detected in files (consider re-saving without BOM or running a normalizer):');
    for (const f of found) console.warn(' - ' + f);
    process.exit(0);
  }
})();

