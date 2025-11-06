#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');

async function listThemes(){
  const base = path.join('smart-input','input');
  try { await fs.ensureDir(base); } catch {}
  const entries = await fs.readdir(base).catch(()=>[]);
  return entries.filter(n => fs.existsSync(path.join(base, n)) && fs.statSync(path.join(base, n)).isDirectory());
}

(async () => {
  const themes = await listThemes();
  if (!themes.length){
    console.log('No themes found; skipping nightly build/QA');
    process.exit(0);
  }
  const env = { ...process.env, SMART_PARSER_CONSUME_INPUT: 'false', SMART_PLATFORMS: process.env.SMART_PLATFORMS || 'salla' };
  const summary = [];
  for (const t of themes){
    console.log(`::group::Build ${t}`);
    const b = spawnSync('node', ['src/cli/factory-build.cjs', t], { env, shell: process.platform==='win32', stdio:'inherit' });
    console.log('::endgroup::');
    const ok = b.status === 0;
    console.log(`::group::QA ${t}`);
    const q = spawnSync('node', ['tools/qa/qa-runner.cjs', t], { env, shell: process.platform==='win32', stdio:'inherit' });
    console.log('::endgroup::');
    summary.push({ theme: t, build: ok, qa: q.status === 0 });
  }
  const outDir = path.join('logs','nightly');
  await fs.ensureDir(outDir);
  const file = path.join(outDir, `nightly-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  await fs.writeJson(file, { startedAt: new Date().toISOString(), themes: summary }, { spaces: 2 });
  console.log('Nightly summary written:', file);
})();

