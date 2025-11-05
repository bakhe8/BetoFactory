import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('build', 'salla');
const twigIndex = path.join(dir, 'views', 'pages', 'index.twig');
const twigMaster = path.join(dir, 'views', 'layouts', 'master.twig');
// Predefined pages
const pProductIndex = path.join(dir, 'views', 'pages', 'product', 'index.twig');
const pProductSingle = path.join(dir, 'views', 'pages', 'product', 'single.twig');
const pCart = path.join(dir, 'views', 'pages', 'cart.twig');
const pThankYou = path.join(dir, 'views', 'pages', 'thank-you.twig');
const pBrandsIndex = path.join(dir, 'views', 'pages', 'brands', 'index.twig');
const pBrandsSingle = path.join(dir, 'views', 'pages', 'brands', 'single.twig');
const twigHeader = path.join(dir, 'views', 'components', 'header', 'header.twig');
const twigFooter = path.join(dir, 'views', 'components', 'footer', 'footer.twig');
const twigProductCard = path.join(dir, 'views', 'components', 'product', 'card.twig');
const twigProductGrid = path.join(dir, 'views', 'components', 'product', 'grid.twig');
const twigAdvGallery = path.join(dir, 'views', 'components', 'advanced', 'product-gallery.twig');
const twigAdvSwatches = path.join(dir, 'views', 'components', 'advanced', 'variation-swatches.twig');
const twigAdvQuickAdd = path.join(dir, 'views', 'components', 'advanced', 'quick-add.twig');
const theme = path.join(dir, 'theme.json');
const twilight = path.join(dir, 'twilight.json');
const localesDir = path.join(dir, 'locales');
const assetSwatches = path.join(dir, 'assets', 'styles', 'swatches.css');
const assetInteraction = path.join(dir, 'assets', 'js', 'product-interaction.js');

if (!fs.existsSync(dir)) throw new Error('build/salla missing');
if (!fs.existsSync(twigIndex)) throw new Error('views/pages/index.twig missing');
if (!fs.existsSync(twigMaster)) throw new Error('views/layouts/master.twig missing');
// Check hooks in master layout
const master = fs.readFileSync(twigMaster, 'utf8');
if (!master.includes("{% hook 'head:start' %}")) throw new Error('head:start hook missing in master.twig');
if (!master.includes("{% hook 'body:classes' %}")) throw new Error('body:classes hook missing in master.twig');
if (!fs.existsSync(twigHeader)) throw new Error('views/components/header/header.twig missing');
if (!fs.existsSync(twigFooter)) throw new Error('views/components/footer/footer.twig missing');
if (!fs.existsSync(twigProductCard)) throw new Error('views/components/product/card.twig missing');
if (!fs.existsSync(twigProductGrid)) throw new Error('views/components/product/grid.twig missing');
// Check product index hooks
const grid = fs.readFileSync(twigProductGrid, 'utf8');
if (!grid.includes("{% hook 'product:index.items.start' %}")) throw new Error('product:index.items.start hook missing');
if (!grid.includes("{% hook 'product:index.items.end' %}")) throw new Error('product:index.items.end hook missing');
if (!fs.existsSync(twigAdvGallery)) throw new Error('views/components/advanced/product-gallery.twig missing');
if (!fs.existsSync(twigAdvSwatches)) throw new Error('views/components/advanced/variation-swatches.twig missing');
if (!fs.existsSync(twigAdvQuickAdd)) throw new Error('views/components/advanced/quick-add.twig missing');
if (!fs.existsSync(theme)) throw new Error('theme.json missing');
if (!fs.existsSync(twilight)) throw new Error('twilight.json missing');
if (!fs.existsSync(localesDir)) throw new Error('locales missing');
if (!fs.existsSync(assetSwatches)) throw new Error('assets/styles/swatches.css missing');
if (!fs.existsSync(assetInteraction)) throw new Error('assets/js/product-interaction.js missing');
// Check key predefined pages exist
if (!fs.existsSync(pProductIndex)) throw new Error('pages/product/index.twig missing');
if (!fs.existsSync(pProductSingle)) throw new Error('pages/product/single.twig missing');
if (!fs.existsSync(pCart)) throw new Error('pages/cart.twig missing');
if (!fs.existsSync(pThankYou)) throw new Error('pages/thank-you.twig missing');
if (!fs.existsSync(pBrandsIndex)) throw new Error('pages/brands/index.twig missing');
if (!fs.existsSync(pBrandsSingle)) throw new Error('pages/brands/single.twig missing');
console.log('✅ Adapter output exists (views + theme + twilight + locales)');
