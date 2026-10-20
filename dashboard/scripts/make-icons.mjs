// Gera os PNGs do PWA a partir de public/icons/icon.svg. Uso (na raiz do repo): node dashboard/scripts/make-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');

// Maskable: o conteúdo precisa caber na zona segura (80%), então o ícone encolhe sobre fundo cheio.
const maskable = svg
  .replace(/<rect[^>]*\/>/, '<rect width="512" height="512" fill="#0b1120"/>')
  .replace('<circle', '<g transform="translate(51.2 51.2) scale(0.8)"><circle')
  .replace('</svg>', '</g></svg>');

const render = (source, size, name) =>
  writeFileSync(join(dir, name), new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng());

render(svg, 192, 'icon-192.png');
render(svg, 512, 'icon-512.png');
render(maskable, 512, 'icon-maskable-512.png');
render(svg, 180, 'apple-touch-icon.png');
console.log('ícones gerados em', dir);
