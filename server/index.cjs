require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const multer = require('multer');
const unzipper = require('unzipper');
const { Server } = require('socket.io');

const TOKEN = process.env.FACTORY_TOKEN || '';
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
function requireAuth(req, res, next){
  if (!TOKEN) return next();
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m && m[1] === TOKEN) return next();
  return res.status(401).json({ ok:false, error: 'Unauthorized' });
}

// Utilities
async function listThemeFolders() {
  const union = new Set();
  const bases = ['smart-input/input', 'input'];
  for (const base of bases) {
    if (!(await fs.pathExists(base))) continue;
    const entries = await fs.readdir(base, { withFileTypes: true });
    for (const e of entries) if (e.isDirectory()) union.add(e.name);
  }
  return Array.from(union).sort();
}

function streamLogs(filePath, eventName) {
  fs.ensureFileSync(filePath);
  let lastSize = 0;
  const emitTail = async () => {
    try {
      const st = await fs.stat(filePath);
      if (st.size < lastSize) { lastSize = 0; }
      const start = Math.max(0, st.size - 16 * 1024);
      const fd = await fs.open(filePath, 'r');
      const buf = Buffer.alloc(st.size - start);
      await fd.read(buf, 0, buf.length, start);
      await fd.close();
      lastSize = st.size;
      io.emit(eventName, buf.toString('utf8'));
    } catch {}
  };
  fs.watch(filePath, { persistent: true }, emitTail);
  emitTail();
}

// Metrics storage
const metricsFile = path.join('logs', 'factory-metrics.json');
const buildStart = new Map();
async function readMetrics(){
  try { return await fs.readJson(metricsFile); } catch { return { builds: { total: 0, success: 0, failed: 0 }, last: [] }; }
}
async function writeMetrics(data){ await fs.ensureDir(path.dirname(metricsFile)); await fs.writeJson(metricsFile, data, { spaces: 2 }); }

// API endpoints
app.get('/api/themes', async (req, res) => {
  res.json({ themes: await listThemeFolders() });
});

app.get('/api/theme/:name', async (req, res) => {
  const name = req.params.name;
  const canonicalPaths = [path.join('smart-input','canonical', name), path.join('canonical', name)];
  let canonical = null;
  for (const p of canonicalPaths) {
    if (await fs.pathExists(path.join(p, 'theme.json'))) { canonical = p; break; }
  }
  const platforms = ['salla-themes','zid-themes','shopify-themes'];
  const builds = {};
  async function tree(dir){
    const files = [];
    async function walk(d){
      if (!(await fs.pathExists(d))) return;
      const entries = await fs.readdir(d);
      for (const e of entries){
        const p = path.join(d, e);
        const st = await fs.stat(p);
        if (st.isDirectory()) await walk(p); else files.push(path.relative(dir, p).replace(/\\/g,'/'));
      }
    }
    await walk(dir);
    return files;
  }
  for (const pf of platforms) {
    const out = path.join('build', pf, name);
    const exists = await fs.pathExists(out);
    builds[pf] = { exists, files: exists ? await tree(out) : [] };
  }
  let themeJson = null; let qa = null; let meta = null;
  if (canonical) {
    if (await fs.pathExists(path.join(canonical,'theme.json'))) themeJson = await fs.readJson(path.join(canonical,'theme.json')).catch(()=>null);
    if (await fs.pathExists(path.join(canonical,'qa-summary.json'))) qa = await fs.readJson(path.join(canonical,'qa-summary.json')).catch(()=>null);
    if (await fs.pathExists(path.join(canonical,'meta.json'))) meta = await fs.readJson(path.join(canonical,'meta.json')).catch(()=>null);
  }
  res.json({ name, canonical, themeJson, qa, meta, builds });
});

app.post('/api/build/:name', requireAuth, async (req, res) => {
  const name = req.params.name;
  const startedAt = Date.now();
  buildStart.set(name, startedAt);
  const proc = spawn(process.execPath, ['src/cli/factory-build.cjs', name], { stdio: ['ignore','pipe','pipe'], shell: process.platform === 'win32' });
  proc.stdout.on('data', d => { io.emit('build:log', { name, stream: 'stdout', data: d.toString() }); });
  proc.stderr.on('data', d => { io.emit('build:log', { name, stream: 'stderr', data: d.toString() }); });
  io.emit('build:start', { name, startedAt });
  proc.on('exit', async (code) => {
    const finishedAt = Date.now();
    const durationMs = finishedAt - (buildStart.get(name) || finishedAt);
    const m = await readMetrics();
    m.builds.total += 1;
    if (code === 0) m.builds.success += 1; else m.builds.failed += 1;
    m.last.unshift({ name, code, startedAt, finishedAt, durationMs });
    m.last = m.last.slice(0, 50);
    await writeMetrics(m);
    io.emit('metrics:update', m); io.emit('build:complete', { name, code, durationMs });
  });
  res.json({ ok: true, started: true, name });
});

// Basic logs endpoint
app.get('/api/logs/:type', async (req, res) => {
  const type = req.params.type;
  const file = type === 'errors' ? path.join('logs','errors.log') : path.join('logs','parser.log');
  if (!(await fs.pathExists(file))) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(await fs.readFile(file, 'utf8'));
});

// Upload zip -> /input/<folder>
fs.ensureDirSync(path.join('tmp','uploads'));
const upload = multer({
  dest: path.join('tmp','uploads'),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, error: 'No file' });
    const outDir = path.join('input', req.body && req.body.name ? String(req.body.name) : `upload_${Date.now()}`);
    await fs.ensureDir(outDir);
    const uploadPath = req.file.path;
    // Unzip
    await unzipper.Open.file(uploadPath).then(zip => zip.extract({ path: outDir, concurrency: 4 }));
    // Enforce unzipped size limit (200MB)
    const calcSize = async (dir) => { let sum=0; const walk=async(d)=>{ const items=await fs.readdir(d); for(const it of items){ const p=path.join(d,it); const s=await fs.stat(p); if(s.isDirectory()) await walk(p); else sum+=s.size; } }; await walk(dir); return sum; };
    const totalSize = await calcSize(outDir);
    if (totalSize > 200 * 1024 * 1024) throw new Error('Unzipped size exceeds limit');
    await fs.remove(uploadPath).catch(()=>{});
    io.emit('themes:update', { themes: await listThemeFolders() });
    res.json({ ok: true, folder: outDir });
  } catch (e) { if (req.file && req.file.path) { await fs.remove(req.file.path).catch(()=>{}); } res.status(500).json({ ok:false, error: e && e.message ? e.message : String(e) }); }
});

app.get('/api/metrics', async (req, res) => {
  res.json(await readMetrics());
});

// Socket wiring
io.on('connection', () => { /* no-op */ });
streamLogs(path.join('logs','parser.log'), 'log:parser');
streamLogs(path.join('logs','errors.log'), 'log:errors');

// Serve dashboard (when built by Vite preview or static)
app.use('/qa', express.static(path.join(__dirname, '..', 'qa')));
app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard', 'dist')));

const port = process.env.FACTORY_SERVER_PORT || 5174;
server.listen(port, () => console.log(`Factory server running on http://localhost:${port}`));






// File content API (text only)
app.get('/api/file', async (req, res) => {
  const { platform, theme, file } = req.query;
  if (!platform || !theme || !file) return res.status(400).json({ ok:false, error:'Missing params' });
  const safePlatform = String(platform).replace(/[^a-z\-]+/gi,'');
  const base = path.join('build', safePlatform, String(theme));
  const requested = path.normalize(path.join(base, String(file)));
  if (!requested.startsWith(path.resolve(base))) return res.status(400).json({ ok:false, error:'Traversal' });
  if (!(await fs.pathExists(requested))) return res.status(404).json({ ok:false, error:'Not found' });
  const textish = /\.(twig|liquid|jinja|json|css|js|md|txt)$/i.test(requested);
  if (!textish) return res.status(415).json({ ok:false, error:'Unsupported content type' });
  const data = await fs.readFile(requested, 'utf8');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(data);
});

app.get('/api/qa/:name', async (req, res) => {
  const name = req.params.name;
  const file = path.join('qa','reports', `${name}-QA.json`);
  if (!(await fs.pathExists(file))) return res.status(404).json({ ok:false, error:'No QA report' });
  const json = await fs.readJson(file).catch(()=>null);
  res.json(json || { ok:false });
});


