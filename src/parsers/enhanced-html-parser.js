const { HTMLParser } = require('./html-parser');
const HTMLExtractor = require('../../core/canonical/extract');
const cheerio = require('cheerio');

class EnhancedHTMLParser extends HTMLParser {
  parse(htmlContent) {
    const basic = super.parse(htmlContent);
    const $ = cheerio.load(htmlContent);
    return {
      ...basic,
      smartAnalysis: this._analyze(htmlContent, $),
      semanticStructure: HTMLExtractor.extractSemanticStructure($),
    };
  }
  _analyze(html, $){
    const elCount = $('*').length; const imgs=$('img').length; const links=$('a').length;
    return { elementCount: elCount, imageCount: imgs, linkCount: links };
  }
}

module.exports = EnhancedHTMLParser;

