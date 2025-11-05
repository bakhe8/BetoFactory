import fs from 'node:fs';
import path from 'node:path';

export function buildCanonical(html) {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  const images = Array.from(html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)).map(
    (m) => m[1]
  );

  const model = {
    $schema: 'https://beto.factory/schema/canonical.json',
    layout: { header: 'default', footer: 'default' },
    components: {
      hero: { type: 'banner', props: { title } },
      'product-grid': { type: 'grid' }
    },
    assets: { images }
  };

  return model;
}

export function writeCanonical(model, outPath) {
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(model, null, 2), 'utf8');
}
