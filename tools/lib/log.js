const fs = require('fs-extra');
const path = require('path');

function createLogger(tag, filePath) {
  fs.ensureDirSync(path.dirname(filePath || 'logs/.placeholder'));
  function write(level, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] [${tag}] ${msg}\n`;
    if (filePath) fs.appendFileSync(filePath, line);
    console.log(msg);
  }
  return {
    info: (m) => write('INFO', m),
    warn: (m) => write('WARN', m),
    error: (m) => write('ERROR', m)
  };
}

class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }
  _format(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.moduleName}] ${message}`;
  }
  info(message) {
    const line = this._format('INFO', message);
    console.log(line);
    this._write(line);
  }
  warn(message) {
    const line = this._format('WARN', message);
    console.warn(line);
    this._write(line);
  }
  error(message, error = null) {
    const line = this._format('ERROR', message);
    console.error(line);
    if (error && error.stack) {
      console.error(error.stack);
      this._write(line + '\n' + error.stack);
    } else {
      this._write(line);
    }
  }
  debug(message) {
    if (process.env.DEBUG) {
      const line = this._format('DEBUG', message);
      console.debug(line);
      this._write(line);
    }
  }
  success(message) {
    const line = this._format('SUCCESS', message);
    console.log('✅ ' + line);
    this._write(line);
  }
  _write(message) {
    try {
      const logFile = path.join('logs', 'smart-system.log');
      fs.ensureDirSync(path.dirname(logFile));
      fs.appendFileSync(logFile, message + '\n');
    } catch (e) {
      // silent
    }
  }
}

module.exports = { createLogger, Logger };
