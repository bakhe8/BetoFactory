const { spawn } = require('child_process');
const path = require('path');

const root = process.cwd();
const watcher = spawn(process.execPath, [path.join('core','watch.js')], { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' });
watcher.on('close', (code)=> process.exit(code));

