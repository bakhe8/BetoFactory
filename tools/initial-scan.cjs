const fs = require('fs-extra');
const path = require('path');

async function listTopLevelDirs(base) {
  try {
    await fs.ensureDir(base);
    const entries = await fs.readdir(base);
    const dirs = [];
    for (const name of entries) {
      const full = path.join(base, name);
      const st = await fs.stat(full).catch(() => null);
      if (st && st.isDirectory()) dirs.push(name);
    }
    return dirs;
  } catch {
    return [];
  }
}

async function scanAndProcess() {
  const baseSmart = path.join('smart-input', 'input');
  const baseRoot = 'input';
  const smart = await listTopLevelDirs(baseSmart);
  const root = await listTopLevelDirs(baseRoot);
  // We do not process here because chokidar with ignoreInitial:false will emit addDir for these
  const processed = 0;
  const skipped = smart.length + root.length;
  const failed = 0;
  return { processed, skipped, failed, smart, root };
}

module.exports = { scanAndProcess };

