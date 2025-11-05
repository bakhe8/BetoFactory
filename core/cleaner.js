import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'build', 'salla');

function addLazyLoadingToTwigImgs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      addLazyLoadingToTwigImgs(p);
    } else if (e.isFile() && e.name.endsWith('.twig')) {
      const src = fs.readFileSync(p, 'utf8');
      const out = src.replace(/<img(?![^>]*\bloading=)[^>]*>/g, (m) => {
        if (m.includes('{%') || m.includes('{{')) return m; // avoid complex dynamic tags crudely
        return m.replace('<img', '<img loading="lazy" decoding="async"');
      });
      if (out !== src) fs.writeFileSync(p, out, 'utf8');
    }
  }
}

function main() {
  if (!fs.existsSync(outDir)) {
    console.error('Nothing to clean. Run the adapter first.');
    process.exit(1);
  }
  addLazyLoadingToTwigImgs(outDir);
  console.log('✅ Cleaner: applied basic optimizations (lazy images).');
}

main();
