const FSHelpers = require('../core/utils/fs.cjs');
const { Logger } = require('./lib/log');
const path = require('path');

class SystemMigrator {
  constructor(){ this.logger = new Logger('migrator'); }
  async migrateExistingProjects(){ this.logger.info('Starting migration to Smart Input System...'); await this._ensureDirs(); const migrated = await this._migrateFolders(); this.logger.success(`Migration completed: ${migrated.length} projects migrated`); }
  async _ensureDirs(){ for (const d of ['smart-input/input','smart-input/canonical','smart-input/processing','logs','config']) await FSHelpers.ensureDir(d); this.logger.info('Smart directory structure created'); }
  async _migrateFolders(){ const migrated=[]; const items = await FSHelpers.readdir('.'); for (const item of items){ if (await this._isProjectFolder(item)){ try { await this._migrate(item); migrated.push(item);} catch(e){ this.logger.error(`Failed to migrate ${item}:`, e);} } } return migrated; }
  async _isProjectFolder(name){ if (name.startsWith('.')||['node_modules','smart-input','logs','config'].includes(name)) return false; const st = await FSHelpers.stat(name).catch(()=>null); if (!st||!st.isDirectory()) return false; const files = await FSHelpers.readdir(name).catch(()=>[]); return files.some(f=>f.endsWith('.html')) || files.includes('assets') || files.includes('images'); }
  async _migrate(name){ const from=name; const to=path.join('smart-input/input', name); if (await FSHelpers.exists(to)) { this.logger.warn(`Skipping ${name} - already exists in smart-input`); return; } this.logger.info(`Migrating: ${name}`); await FSHelpers.copyFileSafe(from, to); this.logger.success(`Migrated: ${name} -> ${to}`); }
}

if (require.main === module){ new SystemMigrator().migrateExistingProjects().then(()=> console.log('🎉 Migration completed successfully!')).catch(e=>{ console.error('❌ Migration failed:', e); process.exit(1);}); }

module.exports = SystemMigrator;

