const path = require('path');

function normalizeRef(ref) {
  if (!ref || typeof ref !== 'string') return ref;
  let v = ref.replace(/\\/g, '/');
  if (v.startsWith('./')) v = v.slice(2);
  v = v.replace(/\/+/g, '/');
  return v;
}

function mapRef(platform, ref) {
  const v = normalizeRef(ref);
  if (!v || /^https?:\/\//i.test(v) || v.startsWith('//') || /^data:/i.test(v)) return v;
  switch (platform) {
    case 'salla':
      return v; // adapter handles placing assets under assets/
    case 'zid':
      return v; // future: wrap with Jinja helpers if needed
    case 'shopify':
      // In Liquid, assets often referenced via {{ 'file' | asset_url }} — mapping requires templating
      return v;
    default:
      return v;
  }
}

module.exports = { normalizeRef, mapRef };

