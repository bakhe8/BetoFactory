const chokidar = require('chokidar');
const { SmartInputParser } = require('./smart-parser');
const { Logger } = require('./lib/log.cjs');
const initialScan = require('./initial-scan.cjs');
const factoryStatus = require('./factory-status.cjs');
const fs = require('fs-extra');
const path = require('path');
const { JobQueue } = require('./job-queue.cjs');

class SimpleWatcher {
  constructor(){
    this.parser = new SmartInputParser();
    this.processing = new Set();
    this.logger = new Logger('simple-watcher');
    this.queue = new JobQueue(async (folder) => {
      await this._process(folder);
    }, { maxRetries: 3, baseDelayMs: 2000 });
  }
  async start(){
    // Enhanced startup with initial scan
    this.logger.info('🚀 Starting Beto Factory Watcher...');
    this.logger.info('🔍 Performing initial scan of /input/...');
    try {
      const scanStats = await initialScan.scanAndProcess();
      this.logger.info(`✅ Initial scan complete: ${scanStats.processed} processed, ${scanStats.skipped} skipped`);
      if (scanStats.failed > 0) this.logger.warn(`${scanStats.failed} folders failed during initial scan`);
    } catch (e) {
      this.logger.error('Initial scan failed:', e);
    }
    const baseSmart = path.join('smart-input','input');
    const baseRoot = 'input';
    const watchPaths = [baseSmart, baseRoot];
    const watcher = chokidar.watch(watchPaths,{ persistent:true, depth:1, ignoreInitial:false, awaitWriteFinish:{ stabilityThreshold:1500, pollInterval:100 }});
    watcher.on('addDir', (p)=> this._handle(p));
    this.w = watcher;
    this.logger.info('👀 Simple watcher ready: ' + watchPaths.map(p=>path.resolve(p)).join(', '));
  }
  async _handle(folderPath){
    let folder = path.basename(folderPath);
    const parent = path.dirname(folderPath);
    const baseSmart = path.resolve(path.join('smart-input','input'));
    const baseRoot = path.resolve('input');
    if (parent !== baseSmart && parent !== baseRoot) return;
    if (this.processing.has(folder)) return;
    // auto-rename if canonical already contains same folder
    const canonicalDir = path.join('smart-input','canonical', folder);
    if (await fs.pathExists(canonicalDir)){
      const stamp = new Date().toISOString().replace(/[:-]/g,'').replace(/\..+$/,'');
      const newName = `${folder}-${stamp}`;
      const newPath = path.join(parent, newName);
      await fs.move(folderPath, newPath, { overwrite:false }).catch(()=>{});
      this.logger.info(`Renamed incoming folder to avoid conflict: ${folder} -> ${newName}`);
      folder = newName;
    }
    this.queue.add(folder);
  }
  async _process(folder){
    this.processing.add(folder);
    this.logger.info(`➡️  Processing: ${folder}`);
    try {
      factoryStatus.markProcessing(folder);
      await this.parser.processDesignFolder(folder);
      const folderPathInput = require('fs-extra').existsSync(path.join('input', folder)) ? path.join('input', folder) : path.join('smart-input','input', folder);
      const hash = factoryStatus.computeFolderHash(folderPathInput);
      factoryStatus.markComplete(folder, hash);
      this.logger.success(`✓ Parsed → ✓ Adapted → ✓ Built: ${folder}`);
    } catch(e){
      factoryStatus.markFailed(folder);
      throw e;
    } finally {
      this.processing.delete(folder);
    }
  }
}

if (require.main === module){ const w = new SimpleWatcher(); w.start(); }

module.exports = SimpleWatcher;
