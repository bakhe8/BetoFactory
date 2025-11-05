import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const srcDir = path.join(root, 'build', 'salla');
const outZip = path.join(root, 'build', 'beto-theme.zip');

function powershellCompress(src, dest) {
  const psCmd = `Compress-Archive -Path "${src}${path.sep}*" -DestinationPath "${dest}" -Force`;
  const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', psCmd], {
    stdio: 'inherit'
  });
  return res.status === 0;
}

function zipCli(src, dest) {
  const res = spawnSync('zip', ['-r', dest, '.'], { cwd: src, stdio: 'inherit' });
  return res.status === 0;
}

function main() {
  if (!fs.existsSync(srcDir)) {
    console.error('Build directory missing. Run the adapter first.');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outZip), { recursive: true });
  // Try PowerShell on Windows; fallback to zip CLI
  let ok = false;
  if (process.platform === 'win32') ok = powershellCompress(srcDir, outZip);
  if (!ok) ok = zipCli(srcDir, outZip);
  if (!ok) {
    console.error('Failed to create ZIP. Ensure PowerShell Compress-Archive or zip is available.');
    process.exit(1);
  }
  console.log(`✅ Exported ${path.relative(root, outZip)}`);
}

main();

