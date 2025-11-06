const path = require('path');
const fs = require('fs-extra');

async function capture(theme){
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch { return { ok:false, skipped: true, reason: 'puppeteer not installed' }; }
  const outDir = path.join('qa','screenshots', theme);
  await fs.ensureDir(outDir);
  const target = process.env.QA_TARGET_URL;
  const url = target || (await fs.pathExists(path.join('preview','index.html')) ? ('file://' + path.resolve(path.join('preview','index.html'))) : null);
  if (!url) return { ok:false, skipped:true, reason:'no target to render' };
  const PNG = require('pngjs').PNG;
  const pixelmatch = require('pixelmatch');
  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];
  const results = {};
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const bp of breakpoints){
    const page = await browser.newPage();
    await page.setViewport({ width: bp.width, height: bp.height, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
    const currentPath = path.join(outDir, `current-${bp.name}.png`);
    await page.screenshot({ path: currentPath, fullPage: true });
    await page.close();
    const baselinePath = path.join('qa','reference','screenshots', theme, `baseline-${bp.name}.png`);
    if (!(await fs.pathExists(baselinePath))) { results[bp.name] = { ok:true, current: currentPath, diff: null, mismatch: null }; continue; }
    const img1 = PNG.sync.read(await fs.readFile(baselinePath));
    const img2 = PNG.sync.read(await fs.readFile(currentPath));
    const { width, height } = img1;
    const diff = new PNG({ width, height });
    const mismatch = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
    const diffPath = path.join(outDir, `diff-${bp.name}.png`);
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    const mismatchPct = ((mismatch / (width*height)) * 100).toFixed(2);
    results[bp.name] = { ok: true, current: currentPath, diff: diffPath, mismatch: Number(mismatchPct) };
  }
  await browser.close();
  const worst = Object.values(results).reduce((m, r) => Math.max(m, Number(r.mismatch||0)), 0);
  return { ok: worst <= 5, results };
}

module.exports = { capture };
