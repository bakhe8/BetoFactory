const chokidar = require('chokidar');
const { SmartInputParser } = require('./smart-parser');
const AdapterBridge = require('./adapter-bridge');
const path = require('path');

class SimpleWatcher {
  constructor(){ this.parser = new SmartInputParser(); this.processing = new Set(); }
  start(){ const base = path.join('smart-input','input'); const watcher = chokidar.watch(base,{ persistent:true, depth:1, ignoreInitial:false, awaitWriteFinish:{ stabilityThreshold:1500, pollInterval:100 }}); watcher.on('addDir', (p)=> this._handle(p)); this.w = watcher; console.log('👀 Simple watcher ready:', path.resolve(base)); }
  async _handle(folderPath){ const folder = path.basename(folderPath); const parent = path.dirname(folderPath); const base = path.resolve(path.join('smart-input','input')); if (parent !== base) return; if (this.processing.has(folder)) return; this.processing.add(folder); await this.processFolderSafe(folder); this.processing.delete(folder); }
  async processFolderSafe(folder){ try { await this.parser.processDesignFolder(folder); await AdapterBridge.generateFromSmartFolder(folder); console.log(`✅ ${folder} processed`);} catch(e){ console.log(`❌ ${folder} failed - check logs`);} }
}

if (require.main === module){ new SimpleWatcher().start(); }

module.exports = SimpleWatcher;

