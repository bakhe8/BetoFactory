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
  const compSections = path.join(viewsComponents, 'sections');
  const compApi = path.join(viewsComponents, 'api');
  ensureDir(viewsLayouts);
  ensureDir(viewsPages);
  ensureDir(viewsComponents);
  ensureDir(compProduct);
  ensureDir(compAdvanced);
  ensureDir(compSections);
  ensureDir(compApi);
  ensureDir(path.join(compProduct, 'options'));

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
    <script>window.STORE_IDENTIFIER = "{{ store.identifier | default('') }}"; window.CURRENCY = "{{ salla.currency.code | default('SAR') }}"; window.API_BASE = window.API_BASE || '';</script>
  </head>
  <body class="{% hook 'body:classes' %}">
    {% hook 'body:start' %}
    {% include "components/header/header.twig" %}
    <main>
      {% block content %}{% endblock %}
    </main>
    {% include "components/footer/footer.twig" %}
    <script src="/assets/js/app.js" defer></script>
    {% if settings.enable_api_integrations | default(false) %}
    <script type="module" src="/assets/js/salla-api-client.js" async></script>
    <script type="module" src="/assets/js/cart-manager.js" async></script>
    <script type="module" src="/assets/js/product-filter.js" async></script>
    <script type="module" src="/assets/js/quick-buy.js" async></script>
    <script type="module" src="/assets/js/api-init.js" async></script>
    {% endif %}
    {% hook 'body:end' %}
  </body>
</html>`;

  const indexTwig = `{% extends "layouts/master.twig" %}
{% block title %}{{ settings.hero_title | default('${defaultHeroTitle.replace(/'/g, "''")}') }} — Home{% endblock %}
{% block content %}
  {% if settings.feature_tier in ['advanced','premium'] %}
    {% include "components/sections/advanced-hero.twig" %}
    {% include "components/sections/configurable-banner.twig" %}
    {% include "components/sections/featured-products.twig" %}
  {% endif %}
  {% if settings.feature_tier == 'premium' %}
    {% include "components/sections/testimonials.twig" %}
    {% include "components/sections/video-banner.twig" %}
  {% endif %}
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
  // OAuth scripts injected when enabled
  const oauthScripts = `\n{% if (settings.enable_api_integrations | default(false)) and (settings.enable_oauth | default(false)) %}\n<script type="module" src="/assets/js/oauth/salla-oauth-client.js" async></script>\n<script type="module" src="/assets/js/oauth/token-manager.js" async></script>\n<script type="module" src="/assets/js/oauth/api-client.js" async></script>\n{% endif %}`;
  // Append OAuth scripts to master if not present
  const masterPath = path.join(viewsLayouts, 'master.twig');
  let masterContent = fs.readFileSync(masterPath, 'utf8');
  if (!masterContent.includes('oauth/salla-oauth-client.js')) {
    masterContent = masterContent.replace('{% hook \'body:end\' %}', `${oauthScripts}\n    {% hook 'body:end' %}`);
    fs.writeFileSync(masterPath, masterContent, 'utf8');
  }
  // API components
  const apiCartTwig = `<div id="ajax-cart" class="ajax-cart">\n  <div class="cart-header">\n    <h4>Shopping Cart</h4>\n    <span class="item-count" id="cart-count">0 items</span>\n  </div>\n  <div class="cart-items" id="cart-items">\n    <!-- Dynamic cart content -->\n  </div>\n  <div class="cart-total">Total: <span id="cart-total">0.00</span> SAR</div>\n  <button onclick="loadCart && loadCart()">Refresh Cart</button>\n</div>`;
  const apiGridTwig = `<div class="product-grid" data-api-endpoint="/store/v1/products">\n  {% if products is defined %}\n    {% for product in products %}\n      <div class="product-card" data-product-id="{{ product.id }}">\n        <h3>{{ product.name }}</h3>\n        <button class="quick-add-btn" data-product-id="{{ product.id }}">Add to Cart</button>\n      </div>\n    {% endfor %}\n  {% endif %}\n</div>`;
  const apiSearchTwig = `<div id="api-search">\n  <input type="search" id="live-search" placeholder="Search products..." />\n  <div id="search-results"></div>\n</div>`;
  fs.writeFileSync(path.join(compApi, 'api-cart.twig'), apiCartTwig, 'utf8');
  fs.writeFileSync(path.join(compApi, 'api-product-grid.twig'), apiGridTwig, 'utf8');
  fs.writeFileSync(path.join(compApi, 'api-search.twig'), apiSearchTwig, 'utf8');

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

  // Product essentials: donation, offer, similar-products
  const donationTwig = `{% hook 'component:product.donation.start' %}\n{% if product and product.donation %}\n  {% if product.donation.target_message %}\n    <span>{{ product.donation.target_message }}</span>\n  {% else %}\n    <div class=\"donation-amounts\">\n      <span>{{ product.donation.collected_amount|money }}</span>\n      <span>{{ product.donation.target_amount|money }}</span>\n    </div>\n    <div class=\"donation-progress\">\n      <div class=\"bar\" style=\"width: {{ product.donation.target_percent }}%\"></div>\n    </div>\n    {% if product.donation.target_end_date %}\n      <small class=\"donation-end\">{{ product.donation.target_end_date|date }}</small>\n    {% endif %}\n  {% endif %}\n{% endif %}\n{% hook 'component:product.donation.end' %}`;
  fs.writeFileSync(path.join(compProduct, 'donation-progress-bar.twig'), donationTwig, 'utf8');

  const offerTwig = `{% hook 'component:product.offer.start' %}\n<div class=\"product-offers\">\n  {% if offer %}\n    <p>{{ offer.name }}: {{ offer.description|raw }}</p>\n    {% if offer.products is defined and offer.products|length %}\n      <div class=\"offers-products\">\n        <div class=\"slider\">\n          {% for product in offer.products %}\n            <div class=\"slide\">{% include \"components/product/card.twig\" with { product: product } %}</div>\n          {% endfor %}\n        </div>\n      </div>\n    {% else %}\n      {% if offer.categories is defined %}\n        {% for category in offer.categories %}\n          <a href=\"{{ category.url }}\"><span>{{ category.name }}</span></a>\n        {% endfor %}\n      {% endif %}\n    {% endif %}\n  {% endif %}\n</div>\n{% hook 'component:product.offer.end' %}`;
  fs.writeFileSync(path.join(compProduct, 'offer.twig'), offerTwig, 'utf8');

  const similarTwig = `{% hook 'component:product.similar.start' %}\n{% if products is defined and products|length %}\n  <div class=\"similar-products\">\n    <h3>{{ 'Similar Products' }}</h3>\n    <div class=\"grid\">\n      {% for product in products %}\n        <div class=\"item\">{% include \"components/product/card.twig\" with { product: product } %}</div>\n      {% endfor %}\n    </div>\n  </div>\n{% endif %}\n{% hook 'component:product.similar.end' %}`;
  fs.writeFileSync(path.join(compProduct, 'similar-products.twig'), similarTwig, 'utf8');
  // Product options components
  const optionsDir = path.join(compProduct, 'options');
  ensureDir(optionsDir);
  const writeOpt = (name, tpl) => fs.writeFileSync(path.join(optionsDir, name + '.twig'), tpl, 'utf8');
  writeOpt('color', `{% if option and option.details %}\n<div class="option option-color" data-option-id="{{ option.id }}">\n  {% for detail in option.details %}\n  <label class="color-item">\n    <input type="radio" name="options[{{ option.id }}]" value="{{ detail.id }}" {{ detail.is_selected?'checked':'' }} {{ detail.is_out?'disabled':'' }} />\n    <span class="swatch" style="background: {{ detail.value | default('#ccc') }}"></span>\n    <span class="name">{{ detail.name }}</span>\n    {% if detail.is_out %}<small>Out of stock</small>{% endif %}\n  </label>\n  {% endfor %}\n</div>\n{% endif %}`);
  writeOpt('date', `<input class="form-input date-element{{ option.required?' required':'' }}" placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" {{ option.attirubtes|raw }} readonly="readonly" value="{{ option.value }}" type="text" />`);
  writeOpt('datetime', `<input class="form-input date-time-element{{ option.required?' required':'' }}" placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" {{ option.attirubtes|raw }} readonly="readonly" value="{{ option.value }}" type="text" />`);
  writeOpt('donation', `{% if product and product.can_donate %}\n<div class="option option-donation"><label>Donation Amount</label><input type="text" name="options[{{ option.id }}]" value="{{ product.price }}" {{ option.attirubtes|raw }} /></div>\n{% else %}\n<h4 class="donation-status">{% if product and product.donation and product.donation.completed %}Donation Exceed Target Amount{% else %}Donation Exceed Target Date{% endif %}</h4>\n{% endif %}`);
  writeOpt('image', `<input name="options[{{ option.id }}]" class="option-image" {% if option.value %}data-default="{{ option.value }}"{% endif %} {{ option.attirubtes|raw }} type="file" />`);
  writeOpt('multiple-options', `{% if option and option.details %}\n<div class="option option-multiple">{% for key,detail in option.details %}<label><input {{ option.disabled?'disabled':'' }} {{ detail.is_selected?'checked':'' }} name="options[{{ option.id }}]" data-option="{{ option.id }}" value="{{ detail.id }}" type="checkbox" {{ option.attirubtes|raw }} /> <span>{{ detail.full_name | default(detail.name) }}</span></label>{% endfor %}</div>{% endif %}`);
  writeOpt('number', `<input placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" value="{{ option.value }}" type="text" {{ option.attirubtes|raw }} />`);
  writeOpt('single-option', `<select name="options[{{ option.id }}]" data-option="{{ option.id }}" {{ option.attirubtes|raw }}><option placeholder value="">{{ option.placeholder }}</option>{% for key,detail in option.details %}<option {{ detail.is_selected ? 'selected' : '' }} value="{{ detail.id }}">{{ detail.full_name | default(detail.name) }}</option>{% endfor %}</select>`);
  writeOpt('splitter', `<div class="splitter"></div>`);
  writeOpt('text', `<input placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" {{ option.attirubtes|raw }} value="{{ option.value }}" type="text"/>`);
  writeOpt('textarea', `<textarea placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" {{ option.attirubtes|raw }}>{{ option.value }}</textarea>`);
  writeOpt('thumbnail', `{% if option and option.details %}{% for detail_index, detail in option.details %}<input {{ detail.is_selected?'checked':'' }} required type="radio" id="option_{{ detail.id }}-{{ option.id }}" {{ detail.is_out?'disabled':'' }} data-itemid="{{ detail.id }}" name="options[{{ option.id }}]" data-img-id="{{ detail.option_value }}" value="{{ detail.id }}" /> <img data-src="{{ detail.image }}" src="{{ asset('images/s-empty.png') }}" class="object-cover h-full w-full lazy-load" title="{{ detail.name }}" alt="{{ detail.name }}" /> <p>{{ detail.name }}</p> {% if detail.is_out %}<small>Out of stock</small>{% endif %}{% endfor %}{% endif %}`);
  writeOpt('time', `<input placeholder="{{ option.placeholder }}" name="options[{{ option.id }}]" {{ option.attirubtes|raw }} readonly="readonly" value="{{ option.value }}" type="text"/>`);

  // Advanced interactive components
  const galleryTwig = `{% hook 'component:advanced.product-gallery.start' %}\n<div class="product-gallery">\n  {% if product and product.images is defined %}\n    <div class="gallery">\n      {% for image in product.images %}\n        <img src="{{ image }}" alt="{{ product.name | default('') }}" />\n      {% endfor %}\n    </div>\n  {% endif %}\n</div>\n{% hook 'component:advanced.product-gallery.end' %}`;
  const swatchesTwig = `{% hook 'component:advanced.variation-swatches.start' %}\n<div class="variation-swatches">\n  {% if product and product.variations is defined %}\n    {% for v in product.variations %}\n      <button class="swatch" data-variant-id="{{ v.id }}">{{ v.name }}</button>\n    {% endfor %}\n  {% endif %}\n</div>\n{% hook 'component:advanced.variation-swatches.end' %}`;
  const quickAddTwig = `{% hook 'component:advanced.quick-add.start' %}\n<div class="quick-add">\n  <button class="quick-add-btn" data-product-id="{{ product.id | default('') }}">Add to Cart</button>\n</div>\n{% hook 'component:advanced.quick-add.end' %}`;
  fs.writeFileSync(path.join(compAdvanced, 'product-gallery.twig'), galleryTwig, 'utf8');
  fs.writeFileSync(path.join(compAdvanced, 'variation-swatches.twig'), swatchesTwig, 'utf8');
  fs.writeFileSync(path.join(compAdvanced, 'quick-add.twig'), quickAddTwig, 'utf8');

  // Section with in-template configuration schema block
  const advancedHeroTwig = `<section class="advanced-hero" style="background-image: url({{ section.settings.background_image }})">
  <h1 style="color: {{ section.settings.text_color | default('#11224E') }}">{{ section.settings.title | default('Advanced Hero') }}</h1>
  {% if section.blocks is defined %}
    {% for block in section.blocks %}
      <div class="block-{{ block.type }}">{{ block.settings.content | default('') }}</div>
    {% endfor %}
  {% endif %}
</section>

{% schema %}
{
  "name": "Advanced Hero",
  "settings": [
    { "type": "image_picker", "id": "background_image", "label": "Background Image" },
    { "type": "text", "id": "title", "label": "Title", "value": "Advanced Hero" },
    { "type": "color", "id": "text_color", "label": "Text Color", "value": "#11224E" }
  ],
  "blocks": [
    { "type": "text", "name": "Text Block", "settings": [ { "type": "text", "id": "content", "label": "Content" } ] }
  ]
}
{% endschema %}`;
  fs.writeFileSync(path.join(compSections, 'advanced-hero.twig'), advancedHeroTwig, 'utf8');

  // Configurable Banner section
  const bannerTwig = `<section class="configurable-banner" style="background: {{ section.settings.background_color | default('#0046FF') }}">
  <div class="container">
    {% if section.settings.background_image %}
      <img src="{{ section.settings.background_image }}" alt="" />
    {% endif %}
    <h2 style="color: {{ section.settings.text_color | default('#fff') }}">{{ section.settings.heading | default('Welcome') }}</h2>
    {% if section.settings.subheading %}<p>{{ section.settings.subheading }}</p>{% endif %}
  </div>
</section>

{% schema %}
{
  "name": "Configurable Banner",
  "settings": [
    {"type": "image_picker", "id": "background_image", "label": "Background Image"},
    {"type": "color", "id": "background_color", "label": "Background Color", "value": "#0046FF"},
    {"type": "color", "id": "text_color", "label": "Text Color", "value": "#ffffff"},
    {"type": "text", "id": "heading", "label": "Heading", "value": "Welcome"},
    {"type": "text", "id": "subheading", "label": "Subheading"}
  ]
}
{% endschema %}`;
  fs.writeFileSync(path.join(compSections, 'configurable-banner.twig'), bannerTwig, 'utf8');

  // Testimonials section
  const testimonialsTwig = `<section class="testimonials">
  <div class="container">
    {% if section.blocks is defined and section.blocks|length %}
      <div class="items">
        {% for block in section.blocks %}
          <blockquote class="item">
            <p>“{{ block.settings.quote | default('Great store!') }}”</p>
            <footer>— {{ block.settings.author | default('Happy Customer') }}</footer>
          </blockquote>
        {% endfor %}
      </div>
    {% else %}
      <p>No testimonials yet.</p>
    {% endif %}
  </div>
</section>

{% schema %}
{
  "name": "Testimonials",
  "settings": [],
  "blocks": [
    {
      "type": "testimonial",
      "name": "Testimonial",
      "settings": [
        {"type": "text", "id": "quote", "label": "Quote"},
        {"type": "text", "id": "author", "label": "Author"}
      ]
    }
  ]
}
{% endschema %}`;
  fs.writeFileSync(path.join(compSections, 'testimonials.twig'), testimonialsTwig, 'utf8');

  // Featured Products section (uses global products if present)
  const featuredProductsTwig = `<section class="featured-products">
  <div class="container">
    <h2>{{ section.settings.title | default('Featured Products') }}</h2>
    {% include "components/product/grid.twig" %}
  </div>
</section>

{% schema %}
{
  "name": "Featured Products",
  "settings": [
    {"type": "text", "id": "title", "label": "Title", "value": "Featured Products"},
    {"type": "range", "id": "limit", "label": "Max items", "min": 4, "max": 24, "step": 4, "value": 8}
  ]
}
{% endschema %}`;
  fs.writeFileSync(path.join(compSections, 'featured-products.twig'), featuredProductsTwig, 'utf8');

  // Video Banner section
  const videoBannerTwig = `<section class="video-banner">
  <div class="container">
    {% if section.settings.video_url %}
      <video controls {% if section.settings.poster %}poster="{{ section.settings.poster }}"{% endif %} style="max-width:100%">
        <source src="{{ section.settings.video_url }}" />
      </video>
    {% else %}
      <p>No video URL set.</p>
    {% endif %}
  </div>
</section>

{% schema %}
{
  "name": "Video Banner",
  "settings": [
    {"type": "text", "id": "video_url", "label": "Video URL"},
    {"type": "image_picker", "id": "poster", "label": "Poster Image"}
  ]
}
{% endschema %}`;
  fs.writeFileSync(path.join(compSections, 'video-banner.twig'), videoBannerTwig, 'utf8');

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
  // Single product (with essentials + advanced gated)
  writePage('product/single.twig', page('Product', `  <article class="product-single">
    {% if product is defined and product.options is defined %}
      {% for option in product.options %}
        {% set include_name = option.type %}
        {% if include_name == 'multi-options' %}{% set include_name = 'multiple-options' %}{% endif %}
        {% if option.display_type is defined %}
          {% if option.display_type == 'color' %}{% set include_name = 'color' %}{% endif %}
          {% if option.display_type == 'image' and include_name in ['single-option','multiple-options'] %}{% set include_name = 'thumbnail' %}{% endif %}
        {% endif %}
        {% include 'components/product/options/' ~ include_name ~ '.twig' with { option: option, product: product } ignore missing %}
      {% endfor %}
    {% endif %}
    {% if settings.show_donation_bar | default(false) and product is defined and product.donation is defined %}
      {% include "components/product/donation-progress-bar.twig" %}
    {% endif %}

    {% if settings.show_offers | default(true) and offer is defined %}
      {% include "components/product/offer.twig" %}
    {% endif %}

    {% if settings.show_similar_products | default(true) and products is defined %}
      {% include "components/product/similar-products.twig" %}
    {% endif %}

    {% if settings.feature_tier in ['advanced','premium'] %}
      {% include "components/advanced/product-gallery.twig" %}
      {% if settings.show_variation_swatches | default(true) %}
        {% include "components/advanced/variation-swatches.twig" %}
      {% endif %}
      {% if settings.quick_ajax_add | default(true) %}
        {% include "components/advanced/quick-add.twig" %}
      {% endif %}
    {% endif %}
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

  // Tier selection from CLI flag --tier or env FEATURE_TIER
  const argTier = (() => { try { const i = process.argv.findIndex(x => x === '--tier'); return i !== -1 ? (process.argv[i+1]||'') : ''; } catch { return ''; } })();
  const envTier = (argTier || process.env.FEATURE_TIER || '').toLowerCase();
  const tierOptions = ['basic','advanced','premium'];
  const chosenTier = tierOptions.includes(envTier) ? envTier : 'basic';

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
      { type: 'range', id: 'products_per_page', label: 'Products per page', min: 8, max: 24, step: 4, value: 16 },
      { type: 'boolean', id: 'show_donation_bar', label: 'Show donation progress bar', value: false },
      { type: 'boolean', id: 'show_offers', label: 'Show offers', value: true },
      { type: 'boolean', id: 'show_similar_products', label: 'Show similar products', value: true },
      { type: 'items', id: 'feature_tier', label: 'Feature Tier', selected: [{"label": "${'${'}chosenTier.charAt(0).toUpperCase() + chosenTier.slice(1){'}'}", "value": "${'${'}chosenTier{'}'}"}], options: [
        {"label":"Basic","value":"basic"},
        {"label":"Advanced","value":"advanced"},
        {"label":"Premium","value":"premium"}
      ] },
      { type: 'boolean', id: 'interactive_product', label: 'Enable interactive product demo', value: Boolean(model.components && model.components['interactive-product']) },
      { type: 'boolean', id: 'show_variation_swatches', label: 'Show variation swatches', value: true },
      { type: 'boolean', id: 'quick_ajax_add', label: 'Quick AJAX add-to-cart', value: true },
      { type: 'boolean', id: 'perf_lazy_loading', label: 'Lazy load images', value: true },
      { type: 'boolean', id: 'perf_async_scripts', label: 'Async scripts', value: true },
      { type: 'boolean', id: 'perf_critical_css', label: 'Inline critical CSS', value: false }
      ,
      // API integration toggles
      { type: 'boolean', id: 'enable_api_integrations', label: 'Enable API integrations', value: chosenTier !== 'basic' },
      { type: 'boolean', id: 'api_quick_add', label: 'API Quick Add', value: true },
      { type: 'boolean', id: 'api_ajax_cart', label: 'API Ajax Cart', value: true },
      { type: 'boolean', id: 'api_live_search', label: 'API Live Search', value: false },
      // OAuth toggles
      { type: 'boolean', id: 'enable_oauth', label: 'Enable OAuth (client credentials)', value: false },
      { type: 'boolean', id: 'oauth_auto_refresh', label: 'OAuth auto refresh', value: true }
    ]
  };
  fs.writeFileSync(path.join(outDir, 'twilight.json'), JSON.stringify(twilight, null, 2), 'utf8');

  console.log(`✅ Salla adapter output at ${path.relative(root, outDir)}`);
}

main();

