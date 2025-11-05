import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

export function buildCanonical(html) {
  const $ = load(html);
  const title = ($('title').text() || 'Untitled').trim();
  const images = $('img')
    .map((_, el) => $(el).attr('src'))
    .get()
    .filter(Boolean);

  const heroSection = $('.hero');
  const hero = {
    type: 'banner',
    props: {
      title: heroSection.find('h1,h2,h3').first().text().trim() || title,
      image: heroSection.find('img').first().attr('src') || images[0] || null
    }
  };

  const hasGrid = $('.product-grid').length > 0;
  const styles = link[rel=\"stylesheet\"].map((_,el)=> .attr('href')).get().filter(Boolean);
  const scripts = script[src].map((_,el)=> .attr('src')).get().filter(Boolean);  const model = {
    $schema: 'https://beto.factory/schema/canonical.json',
    layout: { header: 'default', footer: 'default' },
    components: {
      hero,
      ...(hasGrid ? { 'product-grid': { type: 'grid' } } : {})
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
