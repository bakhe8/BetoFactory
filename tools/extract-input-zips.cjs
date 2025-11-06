#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const unzipper = require('unzipper');

async function extractZip(zipPath, outDir) {
  const dir = await unzipper.Open.file(zipPath);
  let totalSize = 0; let count = 0;
  const maxUnzippedSize = 200 * 1024 * 1024; // 200MB safety cap
  const outAbs = path.resolve(outDir);
  await fs.ensureDir(outAbs);
  for (const entry of dir.files) {
    const p = (entry.path || '').replace(/\\/g, '/');
    if (!p) continue;
    const entryAbs = path.resolve(outAbs, p);
    if (!entryAbs.startsWith(outAbs)) throw new Error('Refusing to write outside output dir: ' + p);
    const size = (entry.vars && entry.vars.uncompressedSize) || entry.uncompressedSize || 0;
    totalSize += size;
    if (totalSize > maxUnzippedSize) throw new Error('Unzipped size limit exceeded');
    if (entry.type === 'Directory' || p.endsWith('/')) {
      await fs.ensureDir(entryAbs);
      continue;
    }
    await fs.ensureDir(path.dirname(entryAbs));
    const buf = await entry.buffer();
    await fs.writeFile(entryAbs, buf);
    count++;
  }
  return { count, totalSize };
}

(async () => {
  const base = path.join('smart-input','input');
  await fs.ensureDir(base);
  const entries = await fs.readdir(base);
  const zips = entries.filter(n => n.toLowerCase().endsWith('.zip'));
  if (!zips.length) { console.log('No zip files found in smart-input/input'); process.exit(0); }
  for (const z of zips) {
    const zipPath = path.join(base, z);
    const name = path.basename(z, path.extname(z));
    const out = path.join(base, name);
    try {
      console.log(`Extracting ${z} -> ${name}/ ...`);
      await fs.remove(out).catch(()=>{});
      const res = await extractZip(zipPath, out);
      console.log(`✅ Extracted ${res.count} files (${res.totalSize} bytes)`);
    } catch (e) {
      console.error(`❌ Failed to extract ${z}:`, e && e.message ? e.message : e);
    }
  }
})();
