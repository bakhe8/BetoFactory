#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');

async function processOne(folder) {
  const { SmartInputParser } = require('../../tools/smart-parser.cjs');
  const validator = require('../../tools/schema-validator.cjs');
  const metrics = require('../../tools/metrics.cjs');

  const parser = new SmartInputParser();

  // Allow folder to exist under either smart-input/input or legacy input
  const fastInput = path.join('smart-input', 'input', folder);
  const legacyInput = path.join('input', folder);
  const existsFast = await fs.pathExists(fastInput);
  const existsLegacy = await fs.pathExists(legacyInput);
  if (!existsFast && !existsLegacy) {
    throw new Error(`Input folder not found in either smart-input/input or input: ${folder}`);
  }

  const t0 = Date.now();
  await parser.processDesignFolder(folder);
  const tParse = Date.now();

  const valid = await validator.validateSmartInputFolder(folder);
  if (!valid) throw new Error(`Schema validation failed for ${folder}`);

  // Phase 10: run QA automation (best-effort, does not break build)
  let qaOk = true; let qaTime = 0; let failStage = null;
  try {
    const qa = require('../../tools/qa/qa-runner.cjs');
    const q0 = Date.now();
    const out = await qa.run(folder);
    qaOk = !!(out && out.ok);
    qaTime = Date.now() - q0;
    console.log(`QA: completed for ${folder}`);
  } catch (e) {
    console.warn('QA runner error:', e && e.message ? e.message : e);
    qaOk = false; failStage = 'qa';
  }
  const tEnd = Date.now();
  const buildTime = tEnd - t0;
  try {
    await metrics.record({
      name: folder,
      build_time: buildTime,
      qa_time: qaTime,
      success: qaOk,
      fail_stage: failStage,
      platform: process.env.SMART_PLATFORMS || 'salla',
      timestamp: new Date().toISOString()
    });
  } catch {}
  return true;
}

async function main() {
  const folder = process.argv[2];
  try {
    if (folder) {
      console.log(`🚀 factory:build → ${folder}`);
      await processOne(folder);
      console.log(`✅ Completed: ${folder}`);
      process.exit(0);
      return;
    }

    // No folder provided: process all directories under smart-input/input (preferred) then fallback to input
    const bases = ['smart-input/input', 'input'];
    const seen = new Set();
    let ok = 0, fail = 0;
    for (const base of bases) {
      if (!(await fs.pathExists(base))) continue;
      const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const name = e.name;
        if (seen.has(name)) continue;
        seen.add(name);
        try {
          console.log(`➡️  Processing: ${name}`);
          await processOne(name);
          console.log(`✅ Done: ${name}`);
          ok++;
        } catch (err) {
          console.error(`❌ Failed: ${name} → ${err && err.message ? err.message : err}`);
          fail++;
        }
      }
    }
    console.log(`📊 Summary: ${ok} ok, ${fail} failed`);
    process.exit(fail > 0 ? 2 : 0);
  } catch (e) {
    console.error('factory:build error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


