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
  const compAdvanced = path.join(viewsComponents, 'advanced');
  ensureDir(viewsLayouts);
  ensureDir(viewsPages);
  ensureDir(viewsComponents);
  ensureDir(compProduct);
  ensureDir(compAdvanced);

  const defaultHeroTitle = model?.components?.hero?.props?.title || 'Welcome';
  const defaultHeroImage = model?.components?.hero?.props?.image || '';

  const masterTwig = `<!doctype html>
<html lang="ar">
  <head>
    {% hook 'head:start' %}
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    {% hook head %}
    <title>{% block title %}${defaultHeroTitle.replace(/'/g, "''")}{% endblock %}</title>
    <link rel="stylesheet" href="/assets/styles/app.css" />
    {% hook 'head:end' %}
  </head>
  <body class="{% hook 'body:classes' %}">
    {% hook 'body:start' %}
    {% include "components/header/header.twig" %}
    <main>
      {% block content %}{% endblock %}
    </main>
    {% include "components/footer/footer.twig" %}
    <script src="/assets/js/app.js" defer></script>
    {% hook 'body:end' %}
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

  {% if settings.interactive_product | default(false) %}
  <section class=\"interactive-product\" data-product-id=\"{{ product.id | default('') }}\">
    {% include \"components/advanced/product-gallery.twig\" %}
    {% if settings.show_variation_swatches | default(true) %}
      {% include \"components/advanced/variation-swatches.twig\" %}
    {% endif %}
    {% if settings.quick_ajax_add | default(true) %}
      {% include \"components/advanced/quick-add.twig\" %}
    {% endif %}
  </section>
  {% endif %}
{% endblock %}
`;

  fs.writeFileSync(path.join(viewsLayouts, 'master.twig'), masterTwig, 'utf8');
  fs.writeFileSync(path.join(viewsPages, 'index.twig'), indexTwig, 'utf8');

  // Components: header & footer
  const headerTwig = `{% hook 'component:header.header.start' %}
<header class="site-header">
  <div class="container">
    <h1>{{ store.name | default('Salla Store') }}</h1>
    <span class="currency">{{ salla.currency.code | default('SAR') }}</span>
  </div>
</header>
{% hook 'component:header.header.end' %}`;
  const footerTwig = `{% hook 'component:footer.footer.start' %}
<footer class="site-footer"><small>&copy; {{ "now"|date("Y") }} {{ store.name | default('Salla Store') }}</small></footer>
{% hook 'component:footer.footer.end' %}`;
  ensureDir(path.join(viewsComponents, 'header'));
  ensureDir(path.join(viewsComponents, 'footer'));
  fs.writeFileSync(path.join(viewsComponents, 'header', 'header.twig'), headerTwig, 'utf8');
  fs.writeFileSync(path.join(viewsComponents, 'footer', 'footer.twig'), footerTwig, 'utf8');

  // Components: product card + grid
  const productCardTwig = `{% hook 'component:product.card.start' %}
<article class="product-card">
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
</article>
{% hook 'component:product.card.end' %}`;
  const productGridTwig = `{% hook 'component:product.grid.start' %}
<div class="product-grid">
  {% hook 'product:index.items.start' %}
  {% if products is defined and products|length > 0 %}
    <div class="grid">
      {% for product in products %}
        {% include "components/product/card.twig" with { product: product } %}
      {% endfor %}
    </div>
  {% else %}
    <p>No products to show.</p>
  {% endif %}
  {% hook 'product:index.items.end' %}
</div>
{% hook 'component:product.grid.end' %}`;
  fs.writeFileSync(path.join(compProduct, 'card.twig'), productCardTwig, 'utf8');
  fs.writeFileSync(path.join(compProduct, 'grid.twig'), productGridTwig, 'utf8');

  // Advanced interactive components
  const galleryTwig = `{% hook 'component:advanced.product-gallery.start' %}\n<div class="product-gallery">\n  {% if product and product.images is defined %}\n    <div class="gallery">\n      {% for image in product.images %}\n        <img src="{{ image }}" alt="{{ product.name | default('') }}" />\n      {% endfor %}\n    </div>\n  {% endif %}\n</div>\n{% hook 'component:advanced.product-gallery.end' %}`;
  const swatchesTwig = `{% hook 'component:advanced.variation-swatches.start' %}\n<div class="variation-swatches">\n  {% if product and product.variations is defined %}\n    {% for v in product.variations %}\n      <button class="swatch" data-variant-id="{{ v.id }}">{{ v.name }}</button>\n    {% endfor %}\n  {% endif %}\n</div>\n{% hook 'component:advanced.variation-swatches.end' %}`;
  const quickAddTwig = `{% hook 'component:advanced.quick-add.start' %}\n<div class="quick-add">\n  <button class="quick-add-btn" data-product-id="{{ product.id | default('') }}">Add to Cart</button>\n</div>\n{% hook 'component:advanced.quick-add.end' %}`;
  fs.writeFileSync(path.join(compAdvanced, 'product-gallery.twig'), galleryTwig, 'utf8');
  fs.writeFileSync(path.join(compAdvanced, 'variation-swatches.twig'), swatchesTwig, 'utf8');
  fs.writeFileSync(path.join(compAdvanced, 'quick-add.twig'), quickAddTwig, 'utf8');

  // Predefined pages (scaffold)
  const ensure = (p) => fs.mkdirSync(p, { recursive: true });
  const writePage = (relPath, content) => {
    const full = path.join(viewsPages, relPath);
    ensure(path.dirname(full));
    fs.writeFileSync(full, content, 'utf8');
  };
  const page = (title, body) => `{% extends "layouts/master.twig" %}\n{% block title %}${title}{% endblock %}\n{% block content %}\n${body}\n{% endblock %}\n`;
  // Product listings
  writePage('product/index.twig', page('Products', `  {% hook 'product:index.items.start' %}
  <div class="product-listing">{% include "components/product/grid.twig" %}</div>
  {% hook 'product:index.items.end' %}`));
  // Single product
  writePage('product/single.twig', page('Product', `  <article class="product-single">
    {% include "components/advanced/product-gallery.twig" %}
    {% include "components/advanced/variation-swatches.twig" %}
    {% include "components/advanced/quick-add.twig" %}
  </article>`));
  // Customer pages
  writePage('customer/profile.twig', page('Profile', `  {% hook 'customer:profile.form.start' %}
  {% hook 'customer:profile.form.fields.start' %}`));
  writePage('customer/wishlist.twig', page('Wishlist', `  {% hook 'customer:wishlist.items.start' %}
  <div class="wishlist"></div>
  {% hook 'customer:wishlist.items.end' %}`));
  writePage('customer/notifications.twig', page('Notifications', `  {% hook 'customer:notifications.items.start' %}
  <div class="notifications"></div>
  {% hook 'customer:notifications.items.end' %}`));
  writePage('customer/orders/index.twig', page('Orders', `  {% hook 'customer:orders.index.items.start' %}
  <div class="orders-list"></div>
  {% hook 'customer:orders.index.items.end' %}`));
  writePage('customer/orders/single.twig', page('Order Details', `  <div class="order-details"></div>`));
  // Blog pages
  writePage('blog/index.twig', page('Blog', `  <div class="blog-list"></div>`));
  writePage('blog/single.twig', page('Article', `  <article class="blog-article"></article>`));
  // Brands pages
  writePage('brands/index.twig', page('Brands', `  {% hook 'brands:index.items.start' %}
  <div class="brands-list"></div>
  {% hook 'brands:index.items.end' %}`));
  writePage('brands/single.twig', page('Brand', `  {% hook 'brands:single.details.start' %}
  <div class="brand-details"></div>
  {% hook 'brands:single.details.end' %}`));
  // Cart / Loyalty / Thank-you / Single / Landing
  writePage('cart.twig', page('Cart', `  {% hook 'cart:items.start' %}
  <div class="cart"></div>
  {% hook 'cart:items.end' %}`));
  writePage('loyalty.twig', page('Loyalty', `  <div class="loyalty"></div>`));
  writePage('thank-you.twig', page('Thank You', `  {% hook 'thank-you:start' %}
  {% hook 'thank-you:items.start' %}
  <div class="summary"></div>
  {% hook 'thank-you:items.end' %}
  {% hook 'thank-you:end' %}`));
  writePage('page-single.twig', page('Page', `  <div class="page-single"></div>`));
  writePage('landing-page.twig', page('Landing', `  <div class="landing"></div>`));

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
      },
      { type: 'boolean', id: 'interactive_product', label: 'Enable interactive product demo', value: Boolean(model.components && model.components['interactive-product']) },
      { type: 'boolean', id: 'show_variation_swatches', label: 'Show variation swatches', value: true },
      { type: 'boolean', id: 'quick_ajax_add', label: 'Quick AJAX add-to-cart', value: true },
      { type: 'boolean', id: 'perf_lazy_loading', label: 'Lazy load images', value: true },
      { type: 'boolean', id: 'perf_async_scripts', label: 'Async scripts', value: true },
      { type: 'boolean', id: 'perf_critical_css', label: 'Inline critical CSS', value: false }
    ]
  };
  fs.writeFileSync(path.join(outDir, 'twilight.json'), JSON.stringify(twilight, null, 2), 'utf8');

  console.log(`✅ Salla adapter output at ${path.relative(root, outDir)}`);
}

main();

