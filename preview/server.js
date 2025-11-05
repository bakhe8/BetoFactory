import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const canonicalFile = path.join(root, 'canonical', 'theme.json');
const sectionsDir = path.join(root, 'build', 'salla', 'views', 'components', 'sections');
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

function send(res, status, content, type = 'text/html') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(content);
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function ensureCanonical() {
  if (!fs.existsSync(canonicalFile)) {
    const res = spawnSync('node', ['core/input.js'], { stdio: 'inherit', cwd: root });
    return res.status === 0 && fs.existsSync(canonicalFile);
  }
  return true;
}

function renderHTML(model) {
  const title = model?.components?.hero?.props?.title || 'Welcome';
  const img = model?.components?.hero?.props?.image;
  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview — ${title}</title>
  <style>body{font-family:system-ui;margin:0;padding:0}header,footer{background:#11224E;color:#fff;padding:12px 16px}main{padding:16px}img{max-width:100%;height:auto}</style>
  </head>
  <body>
  <header><strong>Beto Preview</strong></header>
  <main>
    <section class="hero">
      <h2>${title}</h2>
      ${img ? `<img src="${img}" alt="Hero" />` : ''}
    </section>
    ${model?.components?.['product-grid'] ? `<section class="product-grid"><h3>Products</h3><p>(mock grid)</p></section>` : ''}
  </main>
  <footer><small>Local preview</small></footer>
  </body></html>`;
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.twig': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    send(res, 200, data, mime);
  } catch (e) {
    send(res, 404, 'Not found', 'text/plain');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/') {
    const model = readJSON(canonicalFile);
    const body = `<!doctype html><html><head><meta charset="utf-8"/><title>Beto Preview</title>
    <style>body{font-family:system-ui;padding:24px;max-width:800px;margin:auto}a{display:block;margin:8px 0}</style></head><body>
    <h1>Preview</h1>
    <a href="/render">Render from canonical</a>
    <a href="/input">Serve input/index.html</a>
    <a href="/salla">Serve build/salla/templates/index.twig</a>
    <p>Status: ${model ? 'canonical exists' : 'canonical missing — run npm run canonicalize'}</p>
    </body></html>`;
    return send(res, 200, body);
  }
  if (url.pathname === '/sections') {
    // Render basic previews for schema-driven sections by reading their schema JSON blocks
    try {
      const items = fs.existsSync(sectionsDir)
        ? fs.readdirSync(sectionsDir).filter((f) => f.endsWith('.twig'))
        : [];
      const cards = items.map((f) => {
        const src = fs.readFileSync(path.join(sectionsDir, f), 'utf8');
        const m = src.match(/\{\%\s*schema\s*\%\}([\s\S]*?)\{\%\s*endschema\s*\%\}/);
        let meta = null;
        if (m) {
          try { meta = JSON.parse(m[1]); } catch {}
        }
        const name = (meta && meta.name) || f;
        let preview = '';
        if (f.includes('advanced-hero')) {
          const title = 'Advanced Hero';
          preview = `<section style="padding:16px;background:#eef"><h3>${title}</h3><div style="height:100px;background:#ccc"></div></section>`;
        } else if (f.includes('configurable-banner')) {
          preview = `<section style="padding:16px;background:#0046FF;color:#fff"><h3>Banner</h3><p>Heading/Subheading</p></section>`;
        } else if (f.includes('testimonials')) {
          preview = `<section style="padding:16px"><blockquote>“Great store!” — Customer</blockquote></section>`;
        } else if (f.includes('featured-products')) {
          preview = `<section style=\"padding:16px\"><h3>Featured Products</h3><div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px\"><div style=\"height:50px;background:#ddd\"></div><div style=\"height:50px;background:#ddd\"></div><div style=\"height:50px;background:#ddd\"></div><div style=\"height:50px;background:#ddd\"></div></div></section>`;
        } else if (f.includes('video-banner')) {
          preview = `<section style=\"padding:16px\"><h3>Video Banner</h3><div style=\"height:120px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center\">video</div></section>`;
        }
        return `<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin:10px 0"><strong>${name}</strong>${preview}</div>`;
      }).join('\n');
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Sections Preview</title>
      <style>body{font-family:system-ui;margin:24px;max-width:900px}a{margin-right:8px;display:inline-block}</style></head><body>
      <h1>Schema-Driven Sections</h1>
      <nav><a href="/">Home</a></nav>
      ${cards || '<p>No sections found. Run npm run build.</p>'}
      </body></html>`;
      return send(res, 200, html);
    } catch (e) {
      return send(res, 500, 'Error reading sections');
    }
  }
  if (url.pathname === '/render') {
    if (!fs.existsSync(canonicalFile)) ensureCanonical();
    const model = readJSON(canonicalFile);
    if (!model) return send(res, 200, '<p>No canonical model found. Run npm run canonicalize.</p>');
    return send(res, 200, renderHTML(model));
  }
  if (url.pathname === '/input') {
    const file = path.join(root, 'input', 'index.html');
    return serveStatic(res, file);
  }
  if (url.pathname === '/salla') {
    const file = path.join(root, 'build', 'salla', 'templates', 'index.twig');
    return serveStatic(res, file);
  }
  return send(res, 404, 'Not found', 'text/plain');
});

server.listen(port, () => {
  ensureCanonical();
  console.log(`Preview running on http://localhost:${port}`);
});
