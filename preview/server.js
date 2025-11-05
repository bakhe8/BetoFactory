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
  // Mock API endpoints (no network)
  if (url.pathname.startsWith('/mock/store/v1')) {
    const p = url.pathname.replace('/mock/store/v1', '');
    res.setHeader('Content-Type', 'application/json');
    if (p === '/cart' && req.method === 'POST') {
      return res.end(JSON.stringify({ id: 'mock-cart-1', data: { id: 'mock-cart-1' } }));
    }
    if (p.startsWith('/cart/')) {
      // return minimal cart
      return res.end(JSON.stringify({ data: { items: [{ name: 'Mock Item', image: '', price: { amount: 100, currency: 'SAR' } }], total: { amount: 100 } } }));
    }
    if (p.startsWith('/products')) {
      const data = { data: [ { id: 1, name: 'Mock Product A' }, { id: 2, name: 'Mock Product B' }, { id: 3, name: 'Mock Product C' } ] };
      return res.end(JSON.stringify(data));
    }
    return res.end(JSON.stringify({}));
  }
  if (url.pathname === '/api-demo') {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>API Demo</title>
    <script>window.API_BASE='/mock/store/v1'; window.STORE_IDENTIFIER='mock-store'; window.CURRENCY='SAR';</script>
    </head><body>
    <h1>API Demo</h1>
    <div class="product-grid" data-api-endpoint="/products"></div>
    <div id="api-search"><input type="search" id="live-search" placeholder="Search products..."><div id="search-results"></div></div>
    <div id="ajax-cart" class="ajax-cart"><div class="cart-header"><h4>Cart</h4><span class="item-count" id="cart-count">0 items</span></div><div id="cart-items"></div><div>Total: <span id="cart-total">0.00</span> SAR</div><button onclick="loadCart && loadCart()">Refresh Cart</button></div>
    <script type="module" src="/assets/js/salla-api-client.js"></script>
    <script type="module" src="/assets/js/cart-manager.js"></script>
    <script type="module" src="/assets/js/api-init.js"></script>
    <script type="module" src="/assets/js/quick-buy.js"></script>
    </body></html>`;
    return send(res, 200, html);
  }
  if (url.pathname === '/mock/oauth2/token') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ access_token: 'mock_access', refresh_token: 'mock_refresh', expires_in: 3600, token_type: 'Bearer' }));
  }
  // Serve built assets for /assets and /config
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/config/')) {
    const file = path.join(root, 'build', 'salla', url.pathname.replace(/^\//, ''));
    return serveStatic(res, file);
  }
  if (url.pathname === '/product-demo') {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Product Demo</title>
    <style>body{font-family:system-ui;margin:24px;max-width:900px}.card{border:1px solid #ddd;padding:8px;margin:4px;border-radius:6px}</style></head><body>
    <h1>Product Components Demo (Mock)</h1>
    <section class="donation card">
      <h3>Donation Progress</h3>
      <div><strong>Collected:</strong> 5,000</div>
      <div><strong>Target:</strong> 10,000</div>
      <div style="background:#eee;height:8px;border-radius:6px"><div style="width:50%;background:#0a5;height:8px;border-radius:6px"></div></div>
      <small>Ends: 2025-12-31</small>
    </section>
    <section class="offers card">
      <h3>Offers</h3>
      <div class="grid">
        <div class="card">Offer Product #1</div>
        <div class="card">Offer Product #2</div>
      </div>
    </section>
    <section class="similar card">
      <h3>Similar Products</h3>
      <div class="grid">
        <div class="card">Similar #1</div>
        <div class="card">Similar #2</div>
        <div class="card">Similar #3</div>
      </div>
    </section>
    <p><a href="/">Back</a></p>
    </body></html>`;
    return send(res, 200, html);
  }
  if (url.pathname === '/options-demo') {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Options Demo</title>
    <style>body{font-family:system-ui;margin:24px;max-width:900px}.opt{border:1px solid #ddd;padding:12px;margin:10px 0;border-radius:8px}</style></head><body>
    <h1>Product Options Demo (Mock)</h1>
    <div class="opt"><h3>Color</h3><label><input type="radio"/> <span style="display:inline-block;width:16px;height:16px;background:#c33;border:1px solid #aaa"></span> Red</label></div>
    <div class="opt"><h3>Date</h3><input type="text" placeholder="Pick a date" readonly></div>
    <div class="opt"><h3>Datetime</h3><input type="text" placeholder="Pick date/time" readonly></div>
    <div class="opt"><h3>Donation</h3><input type="text" value="100"/></div>
    <div class="opt"><h3>Image Upload</h3><input type="file"/></div>
    <div class="opt"><h3>Multiple Options</h3><label><input type="checkbox"/> Option A</label> <label><input type="checkbox"/> Option B</label></div>
    <div class="opt"><h3>Number</h3><input type="text" placeholder="0"/></div>
    <div class="opt"><h3>Single Option</h3><select><option>Pick one</option><option>Choice 1</option></select></div>
    <div class="opt"><h3>Splitter</h3><div class="splitter" style="height:1px;background:#eee"></div></div>
    <div class="opt"><h3>Text</h3><input type="text" placeholder="Type here"/></div>
    <div class="opt"><h3>Textarea</h3><textarea placeholder="Notes..."></textarea></div>
    <div class="opt"><h3>Thumbnail</h3><label><input type="radio"/> <img src="" alt="thumb" style="width:48px;height:48px;background:#eee"></label></div>
    <div class="opt"><h3>Time</h3><input type="text" placeholder="00:00" readonly/></div>
    <p><a href="/">Back</a></p>
    </body></html>`;
    return send(res, 200, html);
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
