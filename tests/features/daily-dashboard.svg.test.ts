import { buildDashboardSvg, DASHBOARD_WIDTH, DASHBOARD_HEIGHT } from '../../src/features/daily-dashboard/svg';
import { svgToPng } from '../../src/features/daily-dashboard/png';
import { weekdayInitial } from '../../src/features/daily-dashboard/svg.parts';
import type { DashboardSnapshot } from '../../src/features/daily-dashboard/types';

const day = (date: string, over: Partial<DashboardSnapshot['week'][number]> = {}) => ({
  date, water: 1000, weight: null, trained: false, habitsCompleted: 6, habitsTotal: 12, ...over,
});

const snapshot = (over: Partial<DashboardSnapshot> = {}): DashboardSnapshot => ({
  dayName: 'sexta-feira', date: '2026-09-25', habitsCompleted: 9, habitsTotal: 12,
  water: 1500, waterGoal: 2000, trained: true, cardio: false, streak: 4, nota: 8,
  weight: 82.4, weightDiff: -1.6,
  week: ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
    .map((d, i) => day(d, { trained: i % 2 === 0 })),
  ...over,
});

describe('buildDashboardSvg', () => {
  it('shows the day numbers the user acts on', () => {
    const svg = buildDashboardSvg(snapshot());
    expect(svg).toContain('sexta-feira · 25/09/2026');
    expect(svg).toContain('>8</text>');
    expect(svg).toContain('Dia campeão');
    expect(svg).toContain('9/12');
    expect(svg).toContain('1.500 / 2.000 ml');
    expect(svg).toContain('Sequência: 4 dias');
    expect(svg).toContain('82,4 kg (-1,6 kg desde o início)');
  });

  it('marks pending training and cardio distinctly from done', () => {
    const svg = buildDashboardSvg(snapshot({ trained: false, cardio: true }));
    expect(svg).toMatch(/Treino<\/text><text[^>]*>Pendente/);
    expect(svg).toMatch(/Cárdio<\/text><text[^>]*>Feito/);
  });

  it('escapes markup so data can never inject SVG elements', () => {
    const svg = buildDashboardSvg(snapshot({ dayName: '<script>&' }));
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;');
  });

  it('never emits NaN/Infinity for zero goals or overflowing values', () => {
    const svg = buildDashboardSvg(snapshot({
      habitsTotal: 0, habitsCompleted: 0, waterGoal: 0, water: 9999, nota: 15,
      week: [day('2026-09-25', { habitsTotal: 0, water: 50000 })],
    }));
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it('degrades gracefully with no week data and no weight', () => {
    const svg = buildDashboardSvg(snapshot({ week: [], weight: null, streak: 0, nota: 3 }));
    expect(svg).toContain('Sem dados da semana');
    expect(svg).toContain('Peso: sem registro');
    expect(svg).toContain('Sem sequência ativa');
    expect(svg).toContain('Dia fraco');
  });
});

describe('weekdayInitial', () => {
  it('maps dates in Brasília time, not UTC', () => {
    expect(weekdayInitial('2026-09-27')).toBe('D');
    expect(weekdayInitial('2026-09-28')).toBe('S');
    expect(weekdayInitial('invalid')).toBe('?');
  });
});

describe('svgToPng', () => {
  it('rasterizes to a valid PNG at the dashboard size', () => {
    const png = svgToPng(buildDashboardSvg(snapshot()));
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.readUInt32BE(16)).toBe(DASHBOARD_WIDTH);
    expect(png.readUInt32BE(20)).toBe(DASHBOARD_HEIGHT);
  });
});
