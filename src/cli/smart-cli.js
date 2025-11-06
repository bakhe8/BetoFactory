#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { SmartFolderWatcher } = require('../../tools/smart-watcher');
const { SmartInputParser } = require('../../tools/smart-parser');
const FSHelpers = require('../../core/utils/fs.cjs');
const { Logger } = require('../../tools/lib/log');
const path = require('path');

class SmartCLI {
  constructor(){ this.program = new Command(); this.logger = new Logger('smart-cli'); this.setupCommands(); }
  setupCommands(){
    this.program.version('2.1.0').description('Beto Factory Smart Input System');
    this.program.command('watch').description('Start smart folder watcher').action(()=>{ this.startWatcher(); });
    this.program.command('parse <folder>').description('Parse folder under smart-input/input').option('-o, --output <dir>', 'Output directory', 'smart-input/canonical').action((folder, opts)=> this.parseFolder(folder, opts));
    this.program.command('build <folder>').description('Alias for parse').action((folder)=> this.parseFolder(folder, { output: 'smart-input/canonical' }));
    this.program.command('batch-parse').description('Parse all folders in input dir (sequential)').action(()=> this.batchParse());
    this.program.command('export <folder>').description('Zip from canonical folder (namespaced build)').action((folder)=> this.exportFolder(folder));
    this.program.command('init').description('Initialize smart input system').action(()=> this.initSystem());
    this.program.command('status').description('Show system status').option('--json', 'JSON output for CI').action((opts)=> this.showStatus(opts));
  }
  startWatcher(){ const watcher = new SmartFolderWatcher(); watcher.initialize().then(()=> watcher.start()); process.on('SIGINT', ()=>{ watcher.stop(); process.exit(0);}); }
  async parseFolder(folder, opts){
    try {
      const parser = new SmartInputParser();
      const res = await parser.processDesignFolder(folder);
      this.logger.success(`${chalk.green('✓ Parsed')} ${chalk.gray('→')} ${chalk.green('✓ Adapted')} ${chalk.gray('→')} ${chalk.green('✓ Built')}`);
      this.logger.info(`Output: ${path.join(opts.output, folder)}`);
      return res;
    } catch(e){ this.logger.error(`Failed to parse ${folder}:`, e); process.exit(1);} }
  async batchParse(){
    const inputDir='smart-input/input';
    if (!(await FSHelpers.exists(inputDir))) return this.logger.error(`Input directory does not exist: ${inputDir}`);
    const items = await FSHelpers.readdir(inputDir);
    const parser = new SmartInputParser();
    let ok=0, fail=0;
    for (const item of items){
      const itemPath = path.join(inputDir, item);
      const st = await FSHelpers.stat(itemPath);
      if (st.isDirectory()){
        this.logger.info(`Parsing: ${item}`);
        try { await parser.processDesignFolder(item); ok++; this.logger.success(`Completed: ${item}`);} catch(e){ fail++; this.logger.error(`Failed: ${item}`, e);} 
      }
    }
    this.logger.info(`Batch summary: ${chalk.green(ok+' OK')} / ${chalk.red(fail+' Failed')}`);
  }
  async exportFolder(folder){
    try {
      const SallaAdapter = require('../../adapters/salla/index.cjs');
      const adapter = new SallaAdapter();
      const canonicalPath = path.join('smart-input','canonical', folder);
      await adapter.generateFromCanonical(canonicalPath);
      this.logger.success(`Exported namespaced build for: ${folder}`);
    } catch(e){ this.logger.error(`Export failed for ${folder}:`, e); process.exit(1);} 
  }
  initSystem(){ ['smart-input/input','smart-input/canonical','smart-input/processing','logs','config','tools/lib'].forEach(d=>{ fs = require('fs-extra'); fs.ensureDirSync(d); }); this.logger.success('Smart Input System initialized'); this.logger.info('Add your HTML folders to: smart-input/input/'); }
  async showStatus(opts={}){ 
    const status = { version:'2.1.0', node: process.version, paths: {} };
    const req=['smart-input/input','smart-input/canonical','logs'];
    for (const d of req){ const ex = await FSHelpers.exists(d); status.paths[d] = ex; }
    if (opts.json){ console.log(JSON.stringify(status)); return; }
    this.logger.info('=== Smart Input System Status ===');
    this.logger.info(`Version: ${status.version}`); this.logger.info(`Node.js: ${status.node}`);
    for (const d of req){ this.logger.info(`${d}: ${status.paths[d] ? '✅' : '❌'}`);} 
  }
  start(){ this.program.parse(process.argv); }
}

if (require.main === module){ new SmartCLI().start(); }

module.exports = SmartCLI;
