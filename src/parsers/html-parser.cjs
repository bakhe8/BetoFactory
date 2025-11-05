const cheerio = require('cheerio');

class HTMLParser {
  parse(htmlContent) {
    const $ = cheerio.load(htmlContent);
    // very basic shape compatible with later enhancements
    const components = [];
    $('.product-grid, .products-grid, [data-products]').each((i, el) => {
      components.push({ type: 'product-grid' });
    });
    $('.hero, .banner, .slider').each((i, el) => {
      components.push({ type: 'hero' });
    });
    return { components, layout: {}, sections: [], assets: [] };
  }
}

module.exports = { HTMLParser };

