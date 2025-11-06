require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
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
  // Support multi-platform builds via SMART_PLATFORMS from client
  let platforms = null;
  try {
    const pf = (req.body && (req.body.platforms ?? req.body.SMART_PLATFORMS)) || req.query.platforms;
    if (Array.isArray(pf)) platforms = pf.join(',');
    else if (typeof pf === 'string') platforms = pf;
  } catch {}
  const childEnv = { ...process.env };
  if (platforms) childEnv.SMART_PLATFORMS = platforms;
  const proc = spawn(process.execPath, ['src/cli/factory-build.cjs', name], { stdio: ['ignore','pipe','pipe'], shell: process.platform === 'win32', env: childEnv });
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
  // Secure, backward-compatible file serving from build directory
  const { platform, theme } = req.query;
  let { file } = req.query;
  if (!file) return res.status(400).send('Missing file parameter');

  const baseAbs = path.resolve(path.join(process.cwd(), 'build'));
  const allowed = ['salla-themes','shopify-themes','zid-themes'];
  const firstSeg = String(file).split(/[\\/]/)[0];
  if (!allowed.includes(firstSeg) && platform && theme) {
    file = path.join(String(platform), String(theme), String(file));
  }
  const requestedAbs = path.resolve(path.join(baseAbs, path.normalize(String(file))));
  if (!requestedAbs.startsWith(baseAbs)) {
    console.warn(`File traversal attempt: ${requestedAbs} not in ${baseAbs}`);
    return res.status(400).send('Invalid file path');
  }
  const relativeToBase = path.relative(baseAbs, requestedAbs);
  const firstSegment = relativeToBase.split(path.sep)[0];
  if (!allowed.includes(firstSegment)) {
    console.warn(`Access attempt to non-whitelisted folder: ${firstSegment}`);
    return res.status(400).send('Access to platform folder not allowed');
  }
  if (!(await fs.pathExists(requestedAbs))) {
    return res.status(404).send('File not found');
  }
  const ext = path.extname(requestedAbs).toLowerCase();
  const contentTypes = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.twig':'text/plain','.liquid':'text/plain','.jinja':'text/plain','.md':'text/plain','.txt':'text/plain' };
  res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
  return res.sendFile(requestedAbs);
});

app.get('/api/qa/:name', async (req, res) => {
  const name = req.params.name;
  const file = path.join('qa','reports', `${name}-QA.json`);
  if (!(await fs.pathExists(file))) return res.status(404).json({ ok:false, error:'No QA report' });
  const json = await fs.readJson(file).catch(()=>null);
  res.json(json || { ok:false });
});

// Promote current screenshots to visual baseline for a theme
app.post('/api/qa/promote/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const srcDir = path.join('qa','screenshots', name);
    const dstDir = path.join('qa','reference','screenshots', name);
    await fs.ensureDir(dstDir);
    const files = await fs.readdir(srcDir).catch(()=>[]);
    let promoted = 0;
    for (const f of files){
      if (!/^current-/.test(f) || !/\.png$/i.test(f)) continue;
      const label = f.replace(/^current-/, '').replace(/\.png$/i, '');
      const dst = path.join(dstDir, `baseline-${label}.png`);
      await fs.copy(path.join(srcDir, f), dst, { overwrite: true });
      promoted++;
    }
    return res.json({ ok:true, promoted });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e && e.message ? e.message : String(e) });
  }
});





// Upload ZIP directly into smart-input/input/<themeName>
app.post('/api/upload-input', uploadLimiter, upload.single('theme'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    if (process.env.NODE_ENV === 'production') {
      const token = req.headers['x-factory-token'] || req.body.token;
      if (!token || token !== process.env.FACTORY_TOKEN) {
        await fs.remove(req.file.path).catch(()=>{});
        return res.status(401).json({ error: 'Valid token required for upload' });
      }
    }
    const { themeName } = req.body;
    if (!themeName) {
      await fs.remove(req.file.path).catch(()=>{});
      return res.status(400).json({ error: 'Theme name required' });
    }
    const outDir = path.join('smart-input','input', themeName);
    await fs.ensureDir(outDir);
    const dir = await unzipper.Open.file(req.file.path);
    let totalSize = 0; let entryCount = 0; const maxUnzippedSize = 200 * 1024 * 1024; const maxEntries = 10000;
    const outAbs = path.resolve(outDir);
    for (const entry of dir.files) {
      entryCount++; if (entryCount > maxEntries) throw new Error(`Too many files in archive (max: ${maxEntries})`);
      totalSize += entry.vars.uncompressedSize || 0; if (totalSize > maxUnzippedSize) throw new Error(`Unzipped size exceeds limit of ${maxUnzippedSize} bytes`);
      const entryAbs = path.resolve(path.join(outDir, entry.path));
      if (!entryAbs.startsWith(outAbs)) throw new Error(`Invalid file path in zip: ${entry.path}`);
      if (entry.type === 'Directory') { await fs.ensureDir(entryAbs); }
      else { await fs.ensureDir(path.dirname(entryAbs)); const buf = await entry.buffer(); await fs.writeFile(entryAbs, buf); }
    }
    await fs.remove(req.file.path).catch(()=>{});
    io.emit('themes:update', { themes: await listThemeFolders() });
    return res.json({ success: true, folder: outDir, extracted: entryCount, totalSize });
  } catch (e) {
    if (req.file && req.file.path) { await fs.remove(req.file.path).catch(()=>{}); }
    return res.status(400).json({ error: `Upload failed: ${e && e.message ? e.message : String(e)}` });
  }
});
