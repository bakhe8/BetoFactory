import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'build', 'salla');
const twilightPath = path.join(outDir, 'twilight.json');

function addLazyLoadingToTwigImgs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      addLazyLoadingToTwigImgs(p);
    } else if (e.isFile() && e.name.endsWith('.twig')) {
      const src = fs.readFileSync(p, 'utf8');
      const out = src.replace(/<img(?![^>]*\bloading=)[^>]*>/g, (m) => {
        if (m.includes('{%') || m.includes('{{')) return m; // avoid complex dynamic tags crudely
        return m.replace('<img', '<img loading="lazy" decoding="async"');
      });
      if (out !== src) fs.writeFileSync(p, out, 'utf8');
    }
  }
}

function addAsyncToScripts(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) addAsyncToScripts(p);
    else if (e.isFile() && e.name.endsWith('.twig')) {
      const src = fs.readFileSync(p, 'utf8');
      const out = src.replace(/<script(?![^>]*\basync\b)[^>]*>/g, (m) => {
        if (m.includes('{%') || m.includes('{{')) return m;
        return m.replace('<script', '<script async');
      });
      if (out !== src) fs.writeFileSync(p, out, 'utf8');
    }
  }
}

function inlineCriticalCSS(masterFile, cssFile) {
  if (!fs.existsSync(masterFile) || !fs.existsSync(cssFile)) return;
  const css = fs.readFileSync(cssFile, 'utf8');
  let html = fs.readFileSync(masterFile, 'utf8');
  if (html.includes('<!-- critical-css:start -->')) return;
  const marker = '{% hook head %}';
  const critical = `<!-- critical-css:start --><style>${css}</style><!-- critical-css:end -->`;
  if (html.includes(marker)) {
    html = html.replace(marker, `${marker}\n    ${critical}`);
  } else {
    html = html.replace('<head>', `<head>\n    ${critical}`);
  }
  fs.writeFileSync(masterFile, html, 'utf8');
}

function main() {
  if (!fs.existsSync(outDir)) {
    console.error('Nothing to clean. Run the adapter first.');
    process.exit(1);
  }
  const perf = { lazy: true, async: false, critical: false };
  if (fs.existsSync(twilightPath)) {
    try {
      const tw = JSON.parse(fs.readFileSync(twilightPath, 'utf8'));
      const getSetting = (id, d) => {
        const s = (tw.settings || []).find((x) => x.id === id);
        return typeof s?.value === 'boolean' ? s.value : d;
      };
      perf.lazy = getSetting('perf_lazy_loading', true);
      perf.async = getSetting('perf_async_scripts', true);
      perf.critical = getSetting('perf_critical_css', false);
    } catch {}
  }
  if (perf.lazy) addLazyLoadingToTwigImgs(outDir);
  if (perf.async) addAsyncToScripts(outDir);
  if (perf.critical) inlineCriticalCSS(path.join(outDir, 'views', 'layouts', 'master.twig'), path.join(outDir, 'assets', 'styles', 'app.css'));
  console.log(`✅ Cleaner: optimizations (lazy=${perf.lazy}, async=${perf.async}, critical=${perf.critical}).`);
}

main();
