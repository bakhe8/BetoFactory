#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { cycles: 10, themes: [], consume: false, summaryPath: null };
  for (const a of args) {
    if (a.startsWith('--cycles=')) out.cycles = parseInt(a.split('=')[1], 10) || 10;
    else if (a.startsWith('--themes=')) out.themes = a.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--consume') out.consume = true;
    else if (a === '--no-consume') out.consume = false;
    else if (a.startsWith('--summary=')) out.summaryPath = a.split('=')[1];
  }
  return out;
}

function findThemes() {
  const base = path.join('smart-input', 'input');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(n => fs.statSync(path.join(base, n)).isDirectory());
}

function runBuild(theme, consume) {
  const env = { ...process.env };
  env.SMART_PARSER_CONSUME_INPUT = consume ? 'true' : 'false';
  const r = spawnSync('node', ['src/cli/factory-build.cjs', theme], {
    env,
    stdio: 'ignore',
    shell: process.platform === 'win32'
  });
  return r.status === 0;
}

(async () => {
  const { cycles, themes: cliThemes, consume, summaryPath } = parseArgs();
  let themes = cliThemes.length ? cliThemes : findThemes();
  if (!themes.length) {
    console.error('No themes found under smart-input/input.');
    process.exit(2);
  }

  const stats = Object.fromEntries(themes.map(t => [t, { ok: 0, fail: 0 }]));
  let allOk = true;
  const started = Date.now();
  for (let i = 1; i <= cycles; i++) {
    process.stdout.write(`\n--- STABILITY CYCLE ${i} ---\n`);
    for (const t of themes) {
      const ok = runBuild(t, consume);
      if (ok) { stats[t].ok++; process.stdout.write(`${t}: OK\n`); }
      else { stats[t].fail++; allOk = false; process.stdout.write(`${t}: FAIL\n`); }
    }
  }

  const durationMs = Date.now() - started;
  const summary = themes.map(t => ({ theme: t, ok: stats[t].ok, fail: stats[t].fail }));
  process.stdout.write(`\n=== STABILITY SUMMARY (${cycles} cycles) ===\n`);
  for (const s of summary) process.stdout.write(`${s.theme}: ok=${s.ok}, fail=${s.fail}\n`);
  process.stdout.write(`Duration: ${durationMs}ms\n`);
  process.stdout.write(allOk ? 'ALL OK\n' : 'SOME FAILURES\n');
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const outDir = path.join('logs','stability');
    await fs.ensureDir(outDir);
    const outFile = summaryPath || path.join(outDir, `stability-${stamp}.json`);
    const payload = { startedAt: new Date(started).toISOString(), durationMs, cycles, consume, themes, summary, allOk };
    await fs.writeJson(outFile, payload, { spaces: 2 });
  } catch {}
  process.exit(allOk ? 0 : 1);
})();
