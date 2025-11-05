# Twig Template Engine — Basics (Twilight/Salla)

Twig is a template engine used by Salla’s Twilight themes. Templates contain variables, tags, filters, and functions that render dynamic HTML.

## Delimiters
- `{{ ... }}` — Output the result of an expression.
- `{% ... %}` — Execute statements/logic (loops, conditionals, inheritance).
- `{# ... #}` — Comment, not rendered.

## Minimal Example
```twig
<!DOCTYPE html>
<html>
<head>
  <title>My Twilight Template</title>
</head>
<body>
My name is {{ name }} and I love Twilight.
My favorite flavors of cookies are:
<ul>
  {% for cookie in cookies %}
    <li>{{ cookie.flavor }}</li>
  {% endfor %}
</ul>
<h1>Cookies are the best!</h1>
</body>
</html>
```

## Core Tags
- set — assign values
- extends/blocks — template inheritance
- include — include template parts
- for — loop over arrays
- if/else — conditionals

### set
```twig
{% set lion = 'King' %}
{{ lion }}
```

### extends & blocks
Base layout (master.twig):
```twig
<!DOCTYPE html>
<html>
<head>
  {% block head %}
    <link rel="stylesheet" href="style.css"/>
    <title>{% block title %}{% endblock %} - My Webpage</title>
  {% endblock %}
  </head>
<body>
  <div id="content">{% block content %}{% endblock %}</div>
  <div id="footer">
    {% block footer %}
      &copy; Copyright 2011 by <a href="http://domain.invalid/">you</a>.
    {% endblock %}
  </div>
</body>
</html>
```
Child template:
```twig
{% extends "master.twig" %}

{% block title %}Index{% endblock %}
{% block head %}
  {{ parent() }}
  <style>.important { color: #336699; }</style>
{% endblock %}
{% block content %}
  <h1>Index</h1>
  <p class="important">Welcome to my awesome homepage.</p>
{% endblock %}
```

### blocks helper
```twig
<h1>{{ block('title') }}</h1>

{% block body %}{% endblock %}

{% if block('footer') is defined %}{% endif %}
{% if block('footer', 'common_blocks.twig') is defined %}{% endif %}
{{ block('title', 'common_blocks.twig') }}
```

### include
```twig
{% block header %}
  {{ include('lion') }}
{% endblock %}
```

### for-loop
```twig
{% for product in products %}
  <div class="card shadow">
    <a href="/products/{{ product.id }}">View The Product</a>
  </div>
{% endfor %}
```

### if-else
```twig
{% if order %}
  <div>{{ order.id }}</div>
{% endif %}
```

## Filters
Filters transform values on the left of `|`.
Examples: `raw`, `length`, `date`, `split`, `join`, `lower`, `slice`, etc.

```twig
{# raw — bypass escaping when autoescape is enabled #}
{% autoescape %}
  {{ var|raw }}
{% endautoescape %}

{# length — count items #}
{% if products|length > 10 %}
  <h3>{{ product.name }}</h3>
{% endif %}

{# date — format #}
{{ comment.published_at|date("m/d/Y") }}

{# split — returns array #}
{% set parts = "one,two,three"|split(',') %}
```

## Functions
Functions are called directly, e.g., `block`, `dump`, `parent`, `random`, `range`.

```twig
{# random #}
<div class="price">
  {{ random(10) }}
</div>

{# range #}
{% for i in range(0, 3) %}
  {{ i }},
{% endfor %}
```

You’re now ready to use core Twig tags, filters, and functions within Salla/Twilight themes.

