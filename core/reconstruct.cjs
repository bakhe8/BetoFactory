const path = require('path');
const fs = require('fs-extra');

async function loadMapping(platform){
  const mappingPath = path.join('config','mapping', `${platform}.json`);
  if (!(await fs.pathExists(mappingPath))) return null;
  return fs.readJson(mappingPath);
}

function extractSectionNames(canonical){
  const names = new Set();
  // Prefer components keys
  if (canonical && canonical.components && typeof canonical.components === 'object'){
    Object.keys(canonical.components).forEach(k => names.add(k));
  }
  // Also consider sections array entries
  if (Array.isArray(canonical.sections)){
    for (const s of canonical.sections){
      if (!s) continue;
      const n = s.type || s.name || s.id;
      if (n) names.add(String(n));
    }
  }
  return Array.from(names);
}

async function ensureFile(outDir, relPath, contents){
  const full = path.join(outDir, relPath);
  await fs.ensureDir(path.dirname(full));
  if (!(await fs.pathExists(full))){
    await fs.writeFile(full, contents, 'utf8');
  }
}

async function reconstruct(platform, canonical, outDir){
  const mapping = await loadMapping(platform);
  if (!mapping) return false;
  const ext = mapping.extension || (platform === 'shopify' ? '.liquid' : platform === 'salla' ? '.twig' : '.jinja');
  const tplDir = mapping.templateDir || 'templates';
  const defaultDir = mapping.sectionDir || (platform === 'shopify' ? 'sections' : 'templates');

  const sections = extractSectionNames(canonical);
  for (const name of sections){
    let rel = null;
    if (mapping.map && mapping.map[name]) rel = mapping.map[name];
    if (!rel) {
      const safe = name.toLowerCase().replace(/[^a-z0-9\-]+/g,'-');
      rel = platform === 'shopify' ? path.join('sections', `${safe}${ext}`) : path.join(defaultDir, `${safe}${ext}`);
    }
    const banner = `<!-- Auto-generated from canonical (${platform}) : ${name} -->\n`;
    const body = platform === 'shopify' ? `<!-- ${name} section -->\n<div class="${name}">{{ '${name}' }}</div>\n` : `{# ${name} section #}\n<div class="${name}">{{ '${name}' }}</div>\n`;
    await ensureFile(outDir, rel, banner + body);
  }
  return true;
}

module.exports = { reconstruct };

