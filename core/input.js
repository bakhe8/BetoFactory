import fs from 'node:fs';
import path from 'node:path';
import { buildCanonical, writeCanonical } from './canonical.js';

const root = process.cwd();
const inputPath = path.join(root, 'input', 'index.html');
const outPath = path.join(root, 'canonical', 'theme.json');

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input HTML not found: ${inputPath}`);
    process.exit(1);
  }
  const html = fs.readFileSync(inputPath, 'utf8');
  const model = buildCanonical(html);
  writeCanonical(model, outPath);
  console.log(`✅ Canonical model written to ${path.relative(root, outPath)}`);
}

main();

