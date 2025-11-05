import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'build', 'salla');

function main() {
  if (!fs.existsSync(outDir)) {
    console.error('Nothing to clean. Run the adapter first.');
    process.exit(1);
  }
  // Placeholder for optimization: minify, validate, etc.
  console.log('✅ Cleaner: no-op (placeholder).');
}

main();

