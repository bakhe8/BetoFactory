import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const root = process.cwd();
const themeDir = path.join(root, 'build', 'salla');

const args = process.argv.slice(2);
if (!fs.existsSync(themeDir)) {
  console.error('Salla theme folder not found at build/salla. Run the build steps first.');
  process.exit(1);
}

function tryRun(cmd, a) {
  try {
    const res = spawnSync(cmd, a, { stdio: 'inherit', cwd: themeDir, env: process.env });
    return res.status === 0;
  } catch {
    return false;
  }
}

// Try local bin first, then npx, then global
const candidates = [
  [path.join(root, 'node_modules', '.bin', 'salla'), args],
  ['npx', ['-y', '@salla.sa/cli', ...args]],
  ['salla', args]
];

let ok = false;
for (const [cmd, a] of candidates) {
  if (tryRun(cmd, a)) { ok = true; break; }
}

if (!ok) {
  console.log('ℹ️ Salla CLI unavailable or command failed. Skipping.');
  process.exit(0);
}

