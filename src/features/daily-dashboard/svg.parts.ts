import type { DayPoint } from '../../services/dashboard.service';
import { escapeHtml } from '../../utils/html';

export const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  track: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  green: '#22c55e',
  blue: '#38bdf8',
  orange: '#fb923c',
  red: '#f87171',
};

export const FONT_FAMILY = 'DejaVu Sans, Segoe UI, Arial, sans-serif';
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** NaN/Infinity (ex.: meta 0) viram 0 para nunca vazar atributo inválido no SVG. */
export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0);

interface TextOpts { fill?: string; bold?: boolean; anchor?: 'start' | 'middle' | 'end' }

export function text(x: number, y: number, content: string, size: number, opts: TextOpts = {}): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${opts.fill ?? COLORS.text}"` +
    ` font-weight="${opts.bold ? 'bold' : 'normal'}" text-anchor="${opts.anchor ?? 'start'}">` +
    `${escapeHtml(content)}</text>`;
}

export function card(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${COLORS.card}"/>`;
}

export function bar(x: number, y: number, w: number, h: number, ratio: number, color: string): string {
  const fill = Math.round(w * clamp01(ratio));
  const r = h / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${COLORS.track}"/>` +
    (fill > 0 ? `<rect x="${x}" y="${y}" width="${fill}" height="${h}" rx="${r}" fill="${color}"/>` : '');
}

export function ring(cx: number, cy: number, r: number, ratio: number, color: string, stroke = 22): string {
  const circ = 2 * Math.PI * r;
  const arc = (circ * clamp01(ratio)).toFixed(1);
  const base = `cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${stroke}"`;
  return `<circle ${base} stroke="${COLORS.track}"/>` +
    (clamp01(ratio) > 0
      ? `<circle ${base} stroke="${color}" stroke-linecap="round" stroke-dasharray="${arc} ${circ.toFixed(1)}"` +
        ` transform="rotate(-90 ${cx} ${cy})"/>`
      : '');
}

/** Dia da semana de uma data YYYY-MM-DD; meio-dia BRT evita virar o dia por fuso. */
export function weekdayInitial(date: string): string {
  const d = new Date(`${date}T12:00:00-03:00`);
  return Number.isNaN(d.getTime()) ? '?' : WEEKDAY_INITIALS[d.getUTCDay()];
}

/** Colunas por dia: hábitos (verde) e água (azul) lado a lado; ponto laranja = treinou. */
export function weekChart(x: number, y: number, w: number, h: number, week: DayPoint[], waterGoal: number): string {
  if (week.length === 0) {
    return text(x + w / 2, y + h / 2, 'Sem dados da semana', 28, { fill: COLORS.muted, anchor: 'middle' });
  }
  const col = w / week.length;
  const barW = Math.min(36, col / 3);
  return week.map((d, i) => {
    const cx = x + col * i + col / 2;
    const hH = Math.round(h * clamp01(d.habitsCompleted / d.habitsTotal));
    const wH = Math.round(h * clamp01(d.water / waterGoal));
    const base = y + h;
    return `<rect x="${cx - barW - 3}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${COLORS.track}"/>` +
      `<rect x="${cx + 3}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${COLORS.track}"/>` +
      (hH > 0 ? `<rect x="${cx - barW - 3}" y="${base - hH}" width="${barW}" height="${hH}" rx="6" fill="${COLORS.green}"/>` : '') +
      (wH > 0 ? `<rect x="${cx + 3}" y="${base - wH}" width="${barW}" height="${wH}" rx="6" fill="${COLORS.blue}"/>` : '') +
      `<circle cx="${cx}" cy="${y - 22}" r="9" fill="${d.trained ? COLORS.orange : COLORS.track}"/>` +
      text(cx, base + 42, weekdayInitial(d.date), 26, { fill: COLORS.muted, anchor: 'middle' });
  }).join('');
}
