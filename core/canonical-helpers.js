const cheerio = require('cheerio');

class ParserHelpers {
  static parseHero($, container = '.hero, .banner') {
    const $hero = $(container).first();
    if (!$hero.length) return null;
    const bg = $hero.css && $hero.css('background-image');
    const img = $hero.find('img').attr('src');
    return {
      type: 'hero',
      settings: {
        background: bg || img || null,
        alignment: this.detectAlignment($hero)
      },
      content: {
        title: $hero.find('h1, h2, .title').first().text().trim(),
        subtitle: $hero.find('p, .subtitle').first().text().trim(),
        cta: $hero.find('.btn, .button').first().text().trim()
      }
    };
  }

  static parseProductGrid($, container = '.products, .product-grid') {
    const products = [];
    $(container).find('.product, .item').each((i, el) => {
      const $product = $(el);
      products.push({
        name: ($product.find('.name, .title, h3').first().text() || '').trim(),
        price: ($product.find('.price, [class*="price"]').first().text() || '').trim(),
        image: $product.find('img').attr('src') || null
      });
    });
    return products.length ? { type: 'product-grid', settings: { layout: 'grid' }, content: products } : null;
  }

  static collectAssets($) {
    const assets = { images: [], css: [], js: [] };
    $('img').each((i, el) => { const src = $(el).attr('src'); if (src) assets.images.push(src); });
    $('link[rel="stylesheet"]').each((i, el) => { const href = $(el).attr('href'); if (href) assets.css.push(href); });
    $('script[src]').each((i, el) => { const src = $(el).attr('src'); if (src) assets.js.push(src); });
    return assets;
  }

  static parseHeaderNavigation($) {
    const nav = { menuItems: [], logo: null };
    const $header = $('header, .header, #header').first();
    if ($header.length) {
      nav.logo = $header.find('.logo img, img[alt*="logo" i]').first().attr('src') || null;
      $header.find('nav a, .nav a, .menu a').each((i, el) => {
        const $a = $(el); const href = $a.attr('href'); const text = ($a.text()||'').trim();
        if (href && text) nav.menuItems.push({ text, href });
      });
    }
    return nav;
  }

  static parseFooter($) {
    const footer = { links: [] };
    const $footer = $('footer, .footer, #footer').first();
    if ($footer.length) {
      $footer.find('a').each((i, el) => {
        const $a = $(el); const href = $a.attr('href'); const text = ($a.text()||'').trim();
        if (href && text) footer.links.push({ text, href });
      });
    }
    return footer;
  }

  static detectAlignment($el) {
    const styles = ($el && $el.attr && $el.attr('style')) || '';
    if (styles.includes('text-align: center')) return 'center';
    if (styles.includes('text-align: right')) return 'right';
    return 'left';
  }
}

module.exports = ParserHelpers;
