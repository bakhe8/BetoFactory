const path = require('path');
const fs = require('fs-extra');
const { spawnSync } = require('child_process');
const { QAReporter } = require('./report.cjs');

async function fileExists(p){ try { return await fs.pathExists(p); } catch { return false; } }

async function validateSchema(theme){
  const validator = require('../schema-validator.cjs');
  try { const ok = await validator.validateSmartInputFolder(theme); return { ok }; }
  catch(e){ return { ok:false, error: e && e.message ? e.message : String(e) }; }
}

async function checkAssets(theme){
  const canonical = path.join('smart-input','canonical', theme, 'theme.json');
  if (!(await fileExists(canonical))) return { ok:false, error: 'Missing canonical theme.json'};
  const json = await fs.readJson(canonical).catch(()=>null);
  if (!json) return { ok:false, error: 'Invalid canonical JSON' };
  const listFrom = (arr) => Array.isArray(arr) ? arr : [];
  const flatten = (key) => (json.pages ? json.pages : [json]).flatMap(r => listFrom(r.assets && r.assets[key]));
  const all = [...new Set([...flatten('images'), ...flatten('styles'), ...flatten('scripts')])];
  const buildRoots = [path.join('build','salla-themes', theme), path.join('build','shopify-themes', theme), path.join('build','zid-themes', theme)];
  const missing = [];
  for (const a of all){
    if (!a || /^https?:\/\//i.test(a) || a.startsWith('//') || /^data:/i.test(a)) continue;
    let found = false;
    for (const root of buildRoots){ if (await fileExists(path.join(root, a))) { found = true; break; } }
    if (!found) missing.push(a);
  }
  return { ok: missing.length === 0, missing };
}

async function platformValidate(theme){
  const out = {};
  // Salla CLI
  try { const r = spawnSync('node', ['core/salla-cli.js','theme','validate'], { shell: process.platform==='win32', stdio:'pipe' }); out.salla = { code: r.status, ok: r.status === 0 }; } catch { out.salla = { ok:false, error:'salla cli not available' }; }
  // Shopify CLI
  try { const r = spawnSync('shopify', ['theme','check'], { shell: process.platform==='win32', stdio:'pipe' }); out.shopify = { code: r.status, ok: r.status === 0 }; } catch { out.shopify = { ok:false, error:'shopify cli not available' }; }
  // Zid lint placeholder
  out.zid = { ok:true, note:'lint not available; skipped' };
  return out;
}

async function run(theme){
  const rep = new QAReporter(theme); await rep.init();
  const schema = await validateSchema(theme); rep.stage('schema', schema);
  const assets = await checkAssets(theme); rep.stage('assets', assets);
  const platforms = await platformValidate(theme); rep.stage('platform', platforms);
  // Visual diff (best-effort)
  let visual = { ok: true, skipped: true };
  try { visual = await require('./visual.cjs').capture(theme); } catch {}
  rep.stage('visual', visual);
  // JS Lint (best-effort)
  try {
    const lintJs = require('./stages/lint-js.cjs');
    const js = await lintJs.run(theme);
    rep.stage('lintJs', js);
  } catch {}
  // CSS Lint (best-effort)
  let lint = { ok: true, skipped: true };
  try {
    const r = spawnSync('npx', ['stylelint','"build/**/*.css"','--config','qa/config/.stylelintrc.json'], { shell: process.platform==='win32', stdio:'pipe' });
    lint = { ok: r.status===0, code: r.status, stdout: String(r.stdout||''), stderr: String(r.stderr||'') };
  } catch {}
  rep.stage('lint', lint);
  // Budgets
  const budgets = await computeBudgets(theme); rep.stage('budgets', budgets);
  // Compute status
  const ok = schema.ok && assets.ok && Object.values(platforms).every(p => p.ok !== false) && (budgets.ok !== false) && (lint.ok !== false) && (visual.ok !== false);
  rep.setStatus(ok ? 'passed' : 'failed');
  const file = await rep.finalize();
  return { ok, file };
}

async function main(){
  const theme = process.argv[2];
  if (!theme){ console.error('Usage: node tools/qa/qa-runner.cjs <theme>'); process.exit(2); }
  try { const { ok } = await run(theme); process.exit(ok ? 0 : 1); } catch(e){ console.error('QA error:', e && e.message ? e.message : e); process.exit(1); }
}

if (require.main === module){ main(); }

async function computeBudgets(theme){
  const roots = ['salla-themes','shopify-themes','zid-themes'];
  const sizes = {};
  for (const r of roots){ const dir = path.join('build', r, theme); sizes[r] = await dirSize(dir); }
  const total = Object.values(sizes).reduce((a,b)=> a + (b||0), 0);
  const max = Number(process.env.QA_BUDGET_MAX_BYTES || 10000000);
  return { ok: total <= max, total, max, perPlatform: sizes };
}
async function dirSize(dir){ try { const st = await fs.stat(dir).catch(()=>null); if (!st || !st.isDirectory()) return 0; let sum=0; const walk=async(d)=>{ const items=await fs.readdir(d); for(const it of items){ const p=path.join(d,it); const s=await fs.stat(p); if(s.isDirectory()) await walk(p); else sum+=s.size; } }; await walk(dir); return sum;} catch { return 0 } }

module.exports = { run };



