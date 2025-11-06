const path = require('path');
const fs = require('fs-extra');

class AdapterManager {
  constructor(cfgPath = path.join('config', 'adapters.json')) {
    this.cfgPath = cfgPath;
    this.registry = null;
  }

  async loadRegistry() {
    if (this.registry) return this.registry;
    if (!(await fs.pathExists(this.cfgPath))) {
      throw new Error(`Adapter config not found: ${this.cfgPath}`);
    }
    const data = await fs.readJson(this.cfgPath);
    if (!data || !data.adapters) throw new Error('Invalid adapters.json: missing adapters');
    this.registry = data.adapters;
    return this.registry;
  }

  async getAdapter(platform) {
    const reg = await this.loadRegistry();
    const entry = reg[platform];
    if (!entry) throw new Error(`Unsupported platform: ${platform}`);
    const modPath = path.resolve(entry.module);
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const AdapterCtor = require(modPath);
    return { AdapterCtor, config: entry };
  }

  async generate(platform, canonicalDirOrFolder) {
    const { AdapterCtor } = await this.getAdapter(platform);
    const adapter = new AdapterCtor();
    const canonicalPath = await this._resolveCanonicalPath(canonicalDirOrFolder);
    return adapter.generateFromCanonical(canonicalPath);
  }

  async generateAll(platforms, folderName) {
    const outputs = [];
    for (const p of platforms) {
      try {
        const res = await this.generate(p, folderName);
        outputs.push({ platform: p, ok: true, result: res });
      } catch (e) {
        outputs.push({ platform: p, ok: false, error: e && e.message ? e.message : String(e) });
      }
    }
    return outputs;
  }

  async _resolveCanonicalPath(arg) {
    // Accept either a folder name under smart-input/canonical or a full path
    if (!arg) throw new Error('No canonical folder provided');
    const maybeDir = path.join('smart-input', 'canonical', arg);
    if (await fs.pathExists(maybeDir)) return maybeDir;
    if (await fs.pathExists(arg)) return arg;
    throw new Error(`Canonical path not found: ${arg}`);
  }
}

module.exports = AdapterManager;

