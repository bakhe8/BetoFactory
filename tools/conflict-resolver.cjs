const fs = require('fs-extra');
const path = require('path');

class ConflictResolver {
  resolveOutputConflict(folderName, type = 'build') {
    const basePath = type === 'build' ? path.join('build', 'salla-themes', folderName) : path.join('canonical', folderName);
    if (!fs.existsSync(basePath)) return folderName;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const newName = `${folderName}_${ts}`;
    console.warn(`${type} path conflict: renamed ${folderName} → ${newName}`);
    return newName;
  }
  ensureSafeOutput(folderName) {
    return { canonicalName: this.resolveOutputConflict(folderName, 'canonical'), buildName: this.resolveOutputConflict(folderName, 'build') };
  }
}

module.exports = new ConflictResolver();

