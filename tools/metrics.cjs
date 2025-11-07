const fs = require('fs-extra');
const path = require('path');

const metricsFile = path.join('logs','factory-metrics.json');

async function read(){
  try { return await fs.readJson(metricsFile); }
  catch { return { builds: { total: 0, success: 0, failed: 0 }, last: [] } }
}

async function write(data){
  await fs.ensureDir(path.dirname(metricsFile));
  await fs.writeJson(metricsFile, data, { spaces: 2 });
}

async function record(entry){
  const m = await read();
  m.builds.total = (m.builds.total||0) + 1;
  if (entry && entry.success) m.builds.success = (m.builds.success||0) + 1; else m.builds.failed = (m.builds.failed||0) + 1;
  m.last = [{...entry}, ...(m.last||[])].slice(0, 200);
  await write(m);
}

module.exports = { read, write, record };

