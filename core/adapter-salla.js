import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const canonicalPath = path.join(root, 'canonical', 'theme.json');
const outDir = path.join(root, 'build', 'salla');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  if (!fs.existsSync(canonicalPath)) {
    console.error('Canonical model not found. Run "npm run canonicalize" first.');
    process.exit(1);
  }
  const model = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

  ensureDir(outDir);
  const viewsLayouts = path.join(outDir, 'views', 'layouts');
  const viewsPages = path.join(outDir, 'views', 'pages');
  const viewsComponents = path.join(outDir, 'views', 'components');
  ensureDir(viewsLayouts);
  ensureDir(viewsPages);
  ensureDir(viewsComponents);

  const defaultHeroTitle = model?.components?.hero?.props?.title || 'Welcome';
  const defaultHeroImage = model?.components?.hero?.props?.image || '';

  const masterTwig = `<!doctype html>
<html lang="ar">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{% block title %}${defaultHeroTitle.replace(/'/g, "''")}{% endblock %}</title>
    <link rel="stylesheet" href="/assets/styles/app.css" />
  </head>
  <body>
    {% include "components/header/header.twig" %}
    <main>
      {% block content %}{% endblock %}
    </main>
    {% include "components/footer/footer.twig" %}
    <script src="/assets/js/app.js" defer></script>
  </body>
</html>`;

  const indexTwig = `{% extends "layouts/master.twig" %}
{% block title %}${defaultHeroTitle.replace(/'/g, "''")} — Home{% endblock %}
{% block content %}
  <section class="hero">
    <h2>{{ hero.title | default('${defaultHeroTitle.replace(/'/g, "''")}') }}</h2>
    {% if hero.image is defined and hero.image %}
      <img src="{{ hero.image }}" alt="Hero" />
    {% else %}
      ${defaultHeroImage ? `<img src="${defaultHeroImage}" alt="Hero" />` : ''}
    {% endif %}
  </section>
  {% if product_grid is defined %}
  <section class="product-grid">
    <h2>Products</h2>
    {# Placeholder for Salla product grid #}
  </section>
  {% endif %}
{% endblock %}
`;

  fs.writeFileSync(path.join(viewsLayouts, 'master.twig'), masterTwig, 'utf8');
  fs.writeFileSync(path.join(viewsPages, 'index.twig'), indexTwig, 'utf8');

  // Components: header & footer
  const headerTwig = `<header class="site-header">
  <div class="container">
    <h1>{{ store.name | default('Salla Store') }}</h1>
    <span class="currency">{{ salla.currency.code | default('SAR') }}</span>
  </div>
</header>`;
  const footerTwig = `<footer class="site-footer"><small>&copy; {{ "now"|date("Y") }} {{ store.name | default('Salla Store') }}</small></footer>`;
  ensureDir(path.join(viewsComponents, 'header'));
  ensureDir(path.join(viewsComponents, 'footer'));
  fs.writeFileSync(path.join(viewsComponents, 'header', 'header.twig'), headerTwig, 'utf8');
  fs.writeFileSync(path.join(viewsComponents, 'footer', 'footer.twig'), footerTwig, 'utf8');

  const themeJson = {
    name: 'Beto Theme',
    version: '0.1.0',
    engine: 'twig',
    entry: 'views/pages/index.twig',
    metadata: { adapter: 'salla' }
  };
  fs.writeFileSync(path.join(outDir, 'theme.json'), JSON.stringify(themeJson, null, 2), 'utf8');

  const twilight = {
    name: { ar: 'بيتو', en: 'Beto Theme' },
    repository: 'https://github.com/bakhe8/BetoFactory',
    author_email: 'support@example.com',
    features: ["breadcrumb"],
    settings: [
      {
        type: 'text',
        id: 'hero_title',
        label: 'Hero title',
        value: defaultHeroTitle
      },
      {
        type: 'image',
        id: 'hero_image',
        label: 'Hero image',
        value: defaultHeroImage || ''
      },
      {
        type: 'boolean',
        id: 'show_products_grid',
        label: 'Show products grid',
        value: Boolean(model.components && model.components['product-grid'])
      }
    ]
  };
  fs.writeFileSync(path.join(outDir, 'twilight.json'), JSON.stringify(twilight, null, 2), 'utf8');

  console.log(`✅ Salla adapter output at ${path.relative(root, outDir)}`);
}

main();
