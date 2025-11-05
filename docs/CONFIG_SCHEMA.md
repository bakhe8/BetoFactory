# Configuration Schema Blocks for Sections

Some Twilight components can embed a configuration schema inside Twig using a `{% schema %} ... {% endschema %}` block. Beto Factory can generate such components so merchants get a UI for customization.

## Example: Advanced Hero Section
File: `views/components/sections/advanced-hero.twig`

```twig
<section class="advanced-hero" style="background-image: url({{ section.settings.background_image }})">
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
{% endschema %}
```

This lets the Twilight engine expose a settings UI for the section.

## Validation
- Test `tests/test-section-schema.js` extracts the JSON between schema tags and validates it parses.
- Twilight config (`twilight.json`) also includes merchant-facing settings including a `range` example for products per page.

## Adding More Sections
- Follow the same pattern under `views/components/sections/`
- Include the section in the desired page template using `{% include "components/sections/<name>.twig" %}`.

