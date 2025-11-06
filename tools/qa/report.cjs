const fs = require('fs-extra');
const path = require('path');

class QAReporter {
  constructor(themeName){
    this.theme = themeName;
    this.startedAt = Date.now();
    this.report = {
      theme: themeName,
      startedAt: new Date(this.startedAt).toISOString(),
      stages: {},
      status: 'pending'
    };
    this.reportsDir = path.join('qa','reports');
    this.logFile = path.join('logs','qa.log');
  }
  async init(){ await fs.ensureDir(this.reportsDir); await fs.ensureDir(path.dirname(this.logFile)); }
  stage(name, data){ this.report.stages[name] = data; }
  setStatus(status){ this.report.status = status; }
  async finalize(){
    this.report.finishedAt = new Date().toISOString();
    const file = path.join(this.reportsDir, `${this.theme}-QA.json`);
    await fs.writeJson(file, this.report, { spaces: 2 });
    await fs.appendFile(this.logFile, `[${new Date().toISOString()}] ${this.theme} => ${this.report.status}\n`);
    // Also write simple HTML report
    const html = this._renderHtml(this.report);
    const htmlPath = path.join(this.reportsDir, `${this.theme}-QA.html`);
    await fs.writeFile(htmlPath, html, 'utf8');
    return file;
  }
  _renderHtml(rep){
    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const badge = rep.status === 'passed' ? '#10b981' : rep.status === 'failed' ? '#ef4444' : '#64748b';
    return `<!doctype html><html><head><meta charset="utf-8"><title>QA ${esc(rep.theme)}</title>
    <style>body{font-family:system-ui,Segoe UI,Arial;margin:20px} pre{background:#0b1020;color:#c6d0f5;padding:12px;border-radius:6px;white-space:pre-wrap}</style>
    </head><body>
    <h1>QA Report — ${esc(rep.theme)}</h1>
    <div style="display:inline-block;background:${badge};color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;">${esc(rep.status)}</div>
    <h2>Stages</h2>
    <pre>${esc(JSON.stringify(rep.stages, null, 2))}</pre>
    </body></html>`;
  }
}

module.exports = { QAReporter };
