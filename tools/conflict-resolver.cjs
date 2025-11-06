const fs = require('fs-extra');
const path = require('path');

class ConflictResolver {
  resolveOutputConflict(folderName, type = 'build') {
    if (type !== 'build') return folderName; // keep canonical folder stable
    const basePath = path.join('build', 'salla-themes', folderName);
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
