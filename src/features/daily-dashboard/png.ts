import { Resvg } from '@resvg/resvg-js';

/** Rasteriza no próprio processo: os dados de saúde não saem do servidor. Fontes vêm do SO (font-dejavu na imagem). */
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
  });
  return resvg.render().asPng();
}
