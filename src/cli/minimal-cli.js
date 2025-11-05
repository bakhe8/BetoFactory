#!/usr/bin/env node

const { program } = require('commander');
const SmartInputParser = require('../../tools/smart-parser');

program
  .name('beto-smart-min')
  .description('Minimal Smart Input CLI (fast mode)')
  .version('2.1.0');

program
  .command('parse <folder>')
  .description('Parse a folder under smart-input/input/<folder>')
  .action(async (folder)=>{
    try{ const parser = new SmartInputParser(); await parser.processDesignFolder(folder); console.log('✅ Done!'); }
    catch(e){ console.error('❌ Failed:', e.message); process.exit(1);} 
  });

program
  .command('watch')
  .description('Watch smart-input/input for new folders and process them')
  .action(()=>{
    require('../../tools/simple-watcher');
  });

program.parse();
