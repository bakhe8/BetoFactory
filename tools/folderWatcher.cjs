const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class FolderWatcher {
  constructor() {
    this.watchPath = 'input';
    this.parserScript = 'tools/parser.cjs';
    this.isProcessing = false;
    this.pendingFolders = new Set();
    this.setupLogging();
  }
  setupLogging() { fs.ensureDirSync('logs'); }
  log(msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [WATCHER] ${msg}\n`;
    fs.appendFileSync('logs/watcher.log', line);
    console.log(`👀 ${msg}`);
  }
  start() {
    this.log(`Starting folder watcher on: ${path.resolve(this.watchPath)}`);
    fs.ensureDirSync(this.watchPath);
    const watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      depth: 1,
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
    });
    watcher
      .on('addDir', this.handleNewFolder.bind(this))
      .on('ready', () => this.log('Watcher is ready and monitoring for new folders'))
      .on('error', (err) => this.log(`Watcher error: ${err}`));
    process.on('SIGINT', () => { this.log('Shutting down watcher...'); watcher.close().then(() => process.exit(0)); });
    return watcher;
  }
  handleNewFolder(folderPath) {
    const folderName = path.basename(folderPath);
    if (path.dirname(folderPath) !== path.resolve(this.watchPath)) return;
    if (folderName.startsWith('.') || folderName === 'node_modules') return;
    this.log(`📦 New folder detected: ${folderName}`);
    this.scheduleProcessing(folderName);
  }
  scheduleProcessing(folderName) { this.pendingFolders.add(folderName); if (!this.isProcessing) this.processPendingFolders(); else this.log(`⏳ Folder queued: ${folderName}`); }
  async processPendingFolders() {
    if (this.isProcessing || this.pendingFolders.size === 0) return;
    this.isProcessing = true;
    while (this.pendingFolders.size > 0) {
      const folderName = Array.from(this.pendingFolders)[0];
      this.pendingFolders.delete(folderName);
      await this.processSingleFolder(folderName);
      await new Promise(r => setTimeout(r, 1000));
    }
    this.isProcessing = false;
  }
  processSingleFolder(folderName) {
    return new Promise((resolve, reject) => {
      this.log(`🔄 Processing folder: ${folderName}`);
      const proc = exec(`node ${this.parserScript} ${folderName}`, { cwd: process.cwd(), timeout: 300000 });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) { this.log(`✅ Successfully processed: ${folderName}`); resolve(); }
        else { this.log(`❌ Failed to process ${folderName}: ${code}`); if (stderr) this.log(`STDERR: ${stderr}`); reject(new Error(`exit ${code}`)); }
      });
      proc.on('error', (err) => { this.log(`❌ Process error for ${folderName}: ${err.message}`); reject(err); });
    });
  }
}

if (require.main === module) { new FolderWatcher().start(); }
module.exports = FolderWatcher;

