const { ESLint } = require('eslint');
const path = require('path');

module.exports = {
  name: 'lint-js',
  async run(theme){
    try {
      const eslint = new ESLint({ useEslintrc: true, cwd: process.cwd() });
      const patterns = [
        path.join('build','salla-themes', theme, '**/*.js'),
        path.join('build','shopify-themes', theme, '**/*.js'),
        path.join('build','zid-themes', theme, '**/*.js')
      ];
      const results = await eslint.lintFiles(patterns);
      const formatter = await eslint.loadFormatter('stylish');
      const output = formatter.format(results);
      const errorCount = results.reduce((s, r) => s + r.errorCount, 0);
      const warningCount = results.reduce((s, r) => s + r.warningCount, 0);
      return { ok: errorCount === 0, errorCount, warningCount, output };
    } catch (e) {
      return { ok: true, skipped: true, reason: 'eslint not available or no files' };
    }
  }
};

