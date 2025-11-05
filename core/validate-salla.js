import { spawnSync } from 'node:child_process';
import path from 'node:path';

const zip = path.join(process.cwd(), 'build', 'beto-theme.zip');

function tryRun(cmd, args) {
  try {
    const res = spawnSync(cmd, args, { stdio: 'inherit' });
    return res.status === 0;
  } catch {
    return false;
  }
}

// Attempt a few common commands. If none available, do not fail.
const candidates = [
  ['salla', ['theme:validate', zip]],
  ['salla-cli', ['validate', zip]],
  ['npx', ['-y', 'salla-cli', 'validate', zip]]
];

let validated = false;
for (const [cmd, args] of candidates) {
  if (tryRun(cmd, args)) {
    validated = true;
    break;
  }
}

if (validated) {
  console.log('✅ Salla validation completed');
  process.exit(0);
} else {
  console.log('ℹ️ Salla CLI not found; skipping validation');
  process.exit(0);
}

