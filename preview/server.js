import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const canonicalFile = path.join(root, 'canonical', 'theme.json');
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
  if (url.pathname === '/render') {
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
  console.log(`Preview running on http://localhost:${port}`);
});

