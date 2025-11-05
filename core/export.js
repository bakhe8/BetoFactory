import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

const root = process.cwd();
const srcDir = path.join(root, 'build', 'salla');
const outZip = path.join(root, 'build', 'beto-theme.zip');

async function zipWithArchiver(src, dest) {
  await new Promise((resolve) => fs.mkdir(path.dirname(dest), { recursive: true }, resolve));
  return await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(true));
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn(err);
      else reject(err);
    });
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(src, false);
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    console.error('Build directory missing. Run the adapter first.');
    process.exit(1);
  }
  await zipWithArchiver(srcDir, outZip).catch((err) => {
    console.error('Export failed:', err.message);
    process.exit(1);
  });
  console.log(`✅ Exported ${path.relative(root, outZip)}`);
}

main();
