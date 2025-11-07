#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

async function removeIfExists(p){ try { await fs.remove(p); } catch {} }

async function cleanLogs(){
  const base = 'logs';
  if (!(await fs.pathExists(base))) return;
  const files = await fs.readdir(base).catch(()=>[]);
  for (const f of files){
    const p = path.join(base, f);
    if (f.endsWith('.log')){
      // Remove old test failure logs and parser/errors logs to declutter
      await removeIfExists(p);
    }
  }
  // Prune stability summaries older than N days (default 7)
  const keepDays = parseInt(process.env.LOGS_KEEP_DAYS||'7',10);
  const cutoff = Date.now() - keepDays*24*60*60*1000;
  const stabDir = path.join(base,'stability');
  if (await fs.pathExists(stabDir)){
    const entries = await fs.readdir(stabDir).catch(()=>[]);
    for (const e of entries){
      const p = path.join(stabDir, e);
      const st = await fs.stat(p).catch(()=>null);
      if (st && st.mtimeMs < cutoff) await fs.remove(p).catch(()=>{});
    }
  }
}

cleanLogs().then(()=>{ console.log('Logs cleanup complete'); }).catch((e)=>{ console.error('Logs cleanup failed:', e?.message||e); process.exit(1); });

