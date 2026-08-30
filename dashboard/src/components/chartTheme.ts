export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    fontSize: 12,
    color: '#e2e8f0',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: '#33415533', stroke: '#334155' },
};

export function formatChartDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
