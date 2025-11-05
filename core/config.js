const FSHelpers = require('./utils/fs.cjs');
const path = require('path');

class Config {
  static async load() {
    const configPaths = [
      path.join(process.cwd(), 'config/smart-input.json'),
      path.join(process.cwd(), 'config/app.json'),
      path.join(__dirname, '../config/smart-input.json')
    ];
    for (const p of configPaths){
      try { const cfg = await FSHelpers.readJSONSafe(p); if (cfg){ console.log(`✅ Loaded config from: ${p}`); return this.mergeWithDefaults(cfg); } }
      catch(e){ console.warn(`⚠️  Could not load config from ${p}: ${e.message}`); }
    }
    console.log('ℹ️  Using default configuration');
    return this.getDefaults();
  }
  static mergeWithDefaults(user){ const base=this.getDefaults(); return this.deepMerge(base, user||{}); }
  static deepMerge(target, source){ const res={...target}; for(const k in source){ if (source[k] && typeof source[k]==='object' && !Array.isArray(source[k])) res[k]=this.deepMerge(res[k]||{}, source[k]); else res[k]=source[k]; } return res; }
  static getDefaults(){ return { watchDirectories:['smart-input/input'], filePatterns:{ html:['*.html','*.htm'], assets:['assets/**','images/**','css/**','js/**'] }, parsing:{ concurrentLimit:3, timeout:30000, retryAttempts:2, extractColors:true, extractTypography:true, validateSchema:true }, validation:{ enabled:true, strictMode:false, customRules:[] }, adapters:{ autoTrigger:true, parallelProcessing:false }, api:{ baseUrl:'https://api.salla.dev', timeout:30000, retries:3 }, build:{ outputDir:'dist', cleanBeforeBuild:true, minifyAssets:true } }; }
  static async save(config){ const p = path.join(process.cwd(),'config/smart-input.json'); await FSHelpers.ensureDir(path.dirname(p)); await FSHelpers.writeIfMissing(p, JSON.stringify(config,null,2)); return p; }
}

module.exports = Config;

