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
  const compProduct = path.join(viewsComponents, 'product');
  ensureDir(viewsLayouts);
  ensureDir(viewsPages);
  ensureDir(viewsComponents);
  ensureDir(compProduct);

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
{% block title %}{{ settings.hero_title | default('${defaultHeroTitle.replace(/'/g, "''")}') }} — Home{% endblock %}
{% block content %}
  <section class="hero">
    <h2>{{ settings.hero_title | default(hero.title | default('${defaultHeroTitle.replace(/'/g, "''")}')) }}</h2>
    {% set img = settings.hero_image | default(hero.image | default('')) %}
    {% if img %}
      <img src="{{ img }}" alt="Hero" />
    {% endif %}
  </section>
  {% if settings.show_products_grid | default(product_grid is defined) %}
  <section class="product-grid">
    <h2>Products</h2>
    {% include "components/product/grid.twig" %}
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

  // Components: product card + grid
  const productCardTwig = `<article class="product-card">
  <a href="{{ product.url | default('#') }}">
    <div class="thumb">
      <img src="{{ product.image | default('') }}" alt="{{ product.name | default('') }}" />
    </div>
    <div class="info">
      <h3>{{ product.name | default('Product') }}</h3>
      {% if product.has_sale %}
        <div class="price"><del>{{ product.price_before }}</del> <strong>{{ product.price }}</strong></div>
      {% else %}
        <div class="price">{{ product.price | default('') }}</div>
      {% endif %}
    </div>
  </a>
</article>`;
  const productGridTwig = `<div class="product-grid">
  {% if products is defined and products|length > 0 %}
    <div class="grid">
      {% for product in products %}
        {% include "components/product/card.twig" with { product: product } %}
      {% endfor %}
    </div>
  {% else %}
    <p>No products to show.</p>
  {% endif %}
</div>`;
  fs.writeFileSync(path.join(compProduct, 'card.twig'), productCardTwig, 'utf8');
  fs.writeFileSync(path.join(compProduct, 'grid.twig'), productGridTwig, 'utf8');

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
