#!/usr/bin/env node
const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const AdapterManager = require('../../core/adapter-manager.cjs');

const program = new Command();
program.name('beto-adapt').description('Multi-platform adapter CLI').version('2.1.0');

program
  .command('adapt')
  .description('Adapt canonical folder to a target platform')
  .requiredOption('-p, --platform <name>', 'Target platform (salla|zid|shopify)')
  .option('-f, --folder <name>', 'Canonical folder name under smart-input/canonical')
  .action(async (opts) => {
    const mgr = new AdapterManager();
    try {
      if (!opts.folder) throw new Error('Please supply --folder <name>');
      console.log(`➡️  Adapting ${opts.folder} → ${opts.platform}`);
      const res = await mgr.generate(opts.platform, opts.folder);
      console.log(`✅ Done: ${opts.platform} → ${JSON.stringify(res)}`);
    } catch (e) {
      console.error('Adapt error:', e && e.message ? e.message : e);
      process.exit(1);
    }
  });

program
  .command('adapt-all')
  .description('Adapt canonical folder to all configured platforms')
  .requiredOption('-f, --folder <name>', 'Canonical folder name under smart-input/canonical')
  .action(async (opts) => {
    const mgr = new AdapterManager();
    try {
      const reg = await mgr.loadRegistry();
      const platforms = Object.keys(reg);
      console.log(`➡️  Adapting ${opts.folder} → ${platforms.join(', ')}`);
      const out = await mgr.generateAll(platforms, opts.folder);
      for (const o of out){
        if (o.ok) console.log(`✅ ${o.platform}`);
        else console.log(`❌ ${o.platform}: ${o.error}`);
      }
      const failed = out.filter(o=>!o.ok).length;
      process.exit(failed > 0 ? 2 : 0);
    } catch (e) {
      console.error('Adapt-all error:', e && e.message ? e.message : e);
      process.exit(1);
    }
  });

program.parse(process.argv);

