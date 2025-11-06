const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const { SmartInputParser } = require('./smart-parser.cjs');

class Queue {
  constructor(){ this.q = []; this.running = false; this.seen = new Set(); }
  async add(fn, key){ if (key && this.seen.has(key)) return; if (key) this.seen.add(key); this.q.push({ fn, key, attempts:0 }); this._run(); }
  async _run(){ if (this.running) return; this.running = true; while(this.q.length){ const it = this.q.shift(); try { await it.fn(); if (it.key) this.seen.delete(it.key); } catch(e){ it.attempts++; if (it.attempts < 3){ const delay = Math.min(30000, 1000 * (2 ** it.attempts)); await new Promise(r=>setTimeout(r, delay)); this.q.push(it);} } } this.running = false; }
}

class SmartFolderWatcher {
  constructor(){ this.queue = new Queue(); this.parser = new SmartInputParser(); this.watcher = null; }
  async start(){
    const inputs = ['smart-input/input/*','input/*'];
    this.watcher = chokidar.watch(inputs, { ignoreInitial: false, depth: 0 });
    this.watcher.on('addDir', (dir) => this._onDir(dir));
    // Initial scan
    const dirs = await this._collectDirs(['smart-input/input','input']);
    for (const d of dirs) await this._onDir(d);
  }
  async _collectDirs(bases){
    const out = [];
    for (const b of bases){ if (!(await fs.pathExists(b))) continue; const items = await fs.readdir(b); for (const it of items){ const p = path.join(b,it); const st = await fs.stat(p).catch(()=>null); if (st && st.isDirectory()) out.push(p); } }
    return out;
  }
  async _onDir(dir){
    const folder = path.basename(dir);
    await this.queue.add(async () => { try { await this.parser.processDesignFolder(folder); } catch(e){ /* retry by queue */ } }, folder);
  }
}

if (require.main === module){ new SmartFolderWatcher().start(); }

module.exports = { SmartFolderWatcher };

