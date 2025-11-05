const chokidar = require('chokidar');
const { SmartInputParser } = require('./smart-parser');
const path = require('path');
const { Logger } = require('./lib/log');
const Config = require('../core/config');

class SmartFolderWatcher {
  constructor(){ this.parser = new SmartInputParser(); this.logger = new Logger('smart-watcher'); this.processing = new Set(); this.config = {}; }
  async initialize(){ this.config = await Config.load(); this.logger.info('Smart Folder Watcher initialized'); }
  start(){ this.logger.info('🚀 Starting Smart Folder Watcher...'); const watchPath=(this.config.watchDirectories&&this.config.watchDirectories[0])||'smart-input/input'; this.watcher = chokidar.watch(watchPath,{persistent:true,depth:1,ignoreInitial:false,ignored:/(^|[\/\\])\./,awaitWriteFinish:{stabilityThreshold:2000,pollInterval:100}}); this.watcher.on('addDir', this.handleNewFolder.bind(this)).on('ready', ()=>this.logger.success('Smart Watcher ready and monitoring')).on('error', (e)=>this.handleError(e)); }
  async handleNewFolder(folderPath){ const folderName=path.basename(folderPath); if (this.processing.has(folderName)) return; const parent=path.dirname(folderPath); const expected=path.resolve((this.config.watchDirectories&&this.config.watchDirectories[0])||'smart-input/input'); if (parent!==expected) return; this.processing.add(folderName); try { await new Promise(r=>setTimeout(r,1000)); await this.parser.processDesignFolder(folderName); this.logger.success(`Successfully processed: ${folderName}`); } catch(e){ this.logger.error(`Failed to process ${folderName}:`, e);} finally { this.processing.delete(folderName);} }
  handleError(e){ this.logger.error('Watcher error:', e); }
  stop(){ if (this.watcher){ this.watcher.close(); this.logger.info('Smart Folder Watcher stopped'); } }
}

if (require.main === module){ const w = new SmartFolderWatcher(); w.initialize().then(()=> w.start()); process.on('SIGINT', ()=>{ w.stop(); process.exit(0);}); process.on('SIGTERM', ()=>{ w.stop(); process.exit(0);}); }

module.exports = { SmartFolderWatcher };

