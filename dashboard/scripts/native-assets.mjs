// Ícones e splash dos apps nativos a partir de public/icons/icon.svg.
// Uso (depois de `bunx cap add android|ios`): node dashboard/scripts/native-assets.mjs
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'icons', 'icon.svg'), 'utf8');
const BG = '#0b1120';
const png = (source, w) => new Resvg(source, { fitTo: { mode: 'width', value: w } }).render().asPng();

// Ícone sem cantos arredondados: o Android/iOS aplicam a própria máscara.
const flat = svg.replace(/(<rect[^>]*?) rx="\d+"/, '$1');
// Primeiro plano adaptativo: o desenho cabe nos 66% centrais (zona segura de 108dp).
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(87 87) scale(0.66)">${
  flat.replace(/^<svg[^>]*>/, '').replace(/<rect[^>]*\/>/, '').replace('</svg>', '')}</g></svg>`;

const splashArt = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.3);
  const icon = `data:image/png;base64,${png(svg, 512).toString('base64')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${BG}"/><image href="${icon}" x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}"/></svg>`;
};
const android = join(root, 'android', 'app', 'src', 'main', 'res');
if (existsSync(android)) {
  const dpi = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, scale] of Object.entries(dpi)) {
    const dir = join(android, `mipmap-${name}`);
    writeFileSync(join(dir, 'ic_launcher.png'), png(svg, Math.round(48 * scale)));
    writeFileSync(join(dir, 'ic_launcher_round.png'), png(svg, Math.round(48 * scale)));
    writeFileSync(join(dir, 'ic_launcher_foreground.png'), png(foreground, Math.round(108 * scale)));
  }
  writeFileSync(join(android, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  // Splash: fundo do app com o ícone centralizado, no tamanho de cada arquivo gerado pelo Capacitor.
  for (const d of readdirSync(android).filter(n => /^drawable(-(land|port))?(-\w+)?$/.test(n))) {
    const file = join(android, d, 'splash.png');
    if (!existsSync(file) || !statSync(file).isFile()) continue;
    const head = readFileSync(file);
    const w = head.readUInt32BE(16), h = head.readUInt32BE(20);
    writeFileSync(file, png(splashArt(w, h), w));
  }
}

const iosSplash = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
if (existsSync(iosSplash)) {
  for (const f of readdirSync(iosSplash).filter(n => n.endsWith('.png'))) writeFileSync(join(iosSplash, f), png(splashArt(2732, 2732), 2732));
}

const ios = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
if (existsSync(ios)) writeFileSync(ios, png(flat, 1024));
console.log('ícones e splash nativos atualizados');
