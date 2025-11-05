import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('build', 'salla');
const twigIndex = path.join(dir, 'views', 'pages', 'index.twig');
const twigMaster = path.join(dir, 'views', 'layouts', 'master.twig');
const theme = path.join(dir, 'theme.json');
const twilight = path.join(dir, 'twilight.json');

if (!fs.existsSync(dir)) throw new Error('build/salla missing');
if (!fs.existsSync(twigIndex)) throw new Error('views/pages/index.twig missing');
if (!fs.existsSync(twigMaster)) throw new Error('views/layouts/master.twig missing');
if (!fs.existsSync(theme)) throw new Error('theme.json missing');
if (!fs.existsSync(twilight)) throw new Error('twilight.json missing');
console.log('✅ Adapter output exists (views + theme + twilight)');
