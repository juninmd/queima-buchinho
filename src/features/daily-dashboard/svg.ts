import type { DashboardSnapshot } from './types';
import { COLORS, FONT_FAMILY, bar, card, clamp01, ring, text, weekChart } from './svg.parts';

export const DASHBOARD_WIDTH = 1080;
export const DASHBOARD_HEIGHT = 1350;

const fmtInt = (n: number): string => Math.round(n).toLocaleString('pt-BR');
const fmtKg = (n: number): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return d && m && y ? `${d}/${m}/${y}` : date;
}

function verdict(nota: number): string {
  if (nota >= 8) return 'Dia campeão';
  if (nota >= 5) return 'Dia na média';
  return 'Dia fraco';
}

function weightLabel(weight: number | null, diff: number): string {
  if (weight === null) return 'Peso: sem registro';
  if (!diff) return `Peso: ${fmtKg(weight)} kg`;
  return `Peso: ${fmtKg(weight)} kg (${diff > 0 ? '+' : ''}${fmtKg(diff)} kg desde o início)`;
}

function statusTile(x: number, y: number, label: string, done: boolean): string {
  return card(x, y, 466, 190) +
    text(x + 36, y + 64, label, 30, { fill: COLORS.muted }) +
    text(x + 36, y + 140, done ? 'Feito' : 'Pendente', 56, { bold: true, fill: done ? COLORS.green : COLORS.red });
}

function progressTile(x: number, y: number, label: string, value: string, ratio: number, color: string): string {
  return card(x, y, 466, 190) +
    text(x + 36, y + 64, label, 30, { fill: COLORS.muted }) +
    text(x + 36, y + 124, value, 46, { bold: true }) +
    bar(x + 36, y + 146, 394, 16, ratio, color);
}

function notaCard(s: DashboardSnapshot): string {
  const color = s.nota >= 8 ? COLORS.green : s.nota >= 5 ? COLORS.blue : COLORS.red;
  const streak = s.streak > 0 ? `Sequência: ${s.streak} dia${s.streak > 1 ? 's' : ''}` : 'Sem sequência ativa';
  return card(64, 200, 952, 300) +
    ring(214, 350, 100, s.nota / 10, color) +
    text(214, 372, String(s.nota), 72, { bold: true, anchor: 'middle' }) +
    text(214, 410, '/10', 24, { fill: COLORS.muted, anchor: 'middle' }) +
    text(380, 300, 'Nota do dia', 30, { fill: COLORS.muted }) +
    text(380, 372, verdict(s.nota), 56, { bold: true }) +
    text(380, 436, streak, 32, { fill: COLORS.orange });
}

function weekCard(s: DashboardSnapshot): string {
  const legend = [['Hábitos', COLORS.green], ['Água', COLORS.blue], ['Treino', COLORS.orange]]
    .map(([label, color], i) => {
      const lx = 104 + i * 190;
      return `<circle cx="${lx}" cy="1263" r="9" fill="${color}"/>` +
        text(lx + 20, 1272, label, 24, { fill: COLORS.muted });
    }).join('');
  return card(64, 950, 952, 350) +
    text(104, 1010, 'Últimos 7 dias', 32, { bold: true }) +
    text(976, 1010, weightLabel(s.weight, s.weightDiff), 24, { fill: COLORS.muted, anchor: 'end' }) +
    weekChart(104, 1060, 872, 120, s.week, s.waterGoal) +
    legend;
}

/** SVG puro e determinístico do painel diário: sem I/O, testável sem rasterizar. */
export function buildDashboardSvg(s: DashboardSnapshot): string {
  const habitsRatio = clamp01(s.habitsCompleted / s.habitsTotal);
  const waterRatio = clamp01(s.water / s.waterGoal);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DASHBOARD_WIDTH}" height="${DASHBOARD_HEIGHT}"` +
    ` viewBox="0 0 ${DASHBOARD_WIDTH} ${DASHBOARD_HEIGHT}" font-family="${FONT_FAMILY}">` +
    `<rect width="100%" height="100%" fill="${COLORS.bg}"/>` +
    text(64, 110, 'Painel do dia', 56, { bold: true }) +
    text(64, 160, `${s.dayName} · ${formatDate(s.date)}`, 30, { fill: COLORS.muted }) +
    text(1016, 110, 'QUEIMA BUCHINHO', 22, { fill: COLORS.muted, anchor: 'end' }) +
    notaCard(s) +
    progressTile(64, 530, 'Hábitos', `${s.habitsCompleted}/${s.habitsTotal}`, habitsRatio, COLORS.green) +
    progressTile(550, 530, 'Água', `${fmtInt(s.water)} / ${fmtInt(s.waterGoal)} ml`, waterRatio, COLORS.blue) +
    statusTile(64, 740, 'Treino', s.trained) +
    statusTile(550, 740, 'Cárdio', s.cardio) +
    weekCard(s) +
    `</svg>`;
}
