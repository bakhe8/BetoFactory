import { spawn } from 'node:child_process';
import path from 'node:path';
import chokidar from 'chokidar';

const root = process.cwd();
const inputGlob = path.join(root, 'input', '**', '*');

let running = false;
let queued = false;

function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' });
    p.on('close', (code) => resolve(code === 0));
  });
}

async function rebuild() {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  console.log('\n[watch] Rebuilding...');
  const ok =
    (await run('node', ['core/input.js'])) &&
    (await run('node', ['core/adapter-salla.js'])) &&
    (await run('node', ['core/assets.js'])) &&
    (await run('node', ['core/locales.js'])) &&
    (await run('node', ['core/salla-cli.js', 'theme', 'validate'])) &&
    (await run('node', ['core/salla-cli.js', 'theme', 'lint']));
  console.log(ok ? '[watch] ✅ Build OK' : '[watch] ❌ Build failed');
  running = false;
  if (queued) {
    queued = false;
    rebuild();
  }
}

console.log('[watch] Watching input/ for changes...');
chokidar.watch(inputGlob, { ignoreInitial: true }).on('all', () => rebuild());
// kick off once
rebuild();

