const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const STATUS_FILE = path.join('logs', 'factory-status.json');

async function readStatus() {
  try {
    return await fs.readJson(STATUS_FILE);
  } catch {
    return { folders: {}, updatedAt: new Date().toISOString() };
  }
}

async function writeStatus(data) {
  data.updatedAt = new Date().toISOString();
  await fs.ensureDir(path.dirname(STATUS_FILE));
  await fs.writeJson(STATUS_FILE, data, { spaces: 2 });
}

async function markProcessing(folder) {
  const s = await readStatus();
  s.folders[folder] = { state: 'processing', at: new Date().toISOString() };
  await writeStatus(s);
}

async function markComplete(folder, hash) {
  const s = await readStatus();
  s.folders[folder] = { state: 'complete', at: new Date().toISOString(), hash };
  await writeStatus(s);
}

async function markFailed(folder) {
  const s = await readStatus();
  s.folders[folder] = { state: 'failed', at: new Date().toISOString() };
  await writeStatus(s);
}

function computeFolderHash(folderPath) {
  try {
    const hash = crypto.createHash('sha1');
    const walk = (p) => {
      const entries = fs.readdirSync(p);
      for (const name of entries) {
        const full = path.join(p, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full);
        else {
          hash.update(name);
          hash.update(String(st.size));
          hash.update(String(st.mtimeMs));
        }
      }
    };
    walk(folderPath);
    return hash.digest('hex');
  } catch {
    return null;
  }
}

module.exports = { markProcessing, markComplete, markFailed, computeFolderHash };

