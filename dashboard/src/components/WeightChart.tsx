import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { DayPoint } from '../types';
import { TOOLTIP_STYLE, formatChartDate } from './chartTheme';

export function WeightChart({ days }: { days: DayPoint[] }) {
  const data = days
    .filter(d => d.weight !== null)
    .map(d => ({ date: formatChartDate(d.date), peso: d.weight }));

  if (data.length === 0) {
    return <p className="chart-empty">Sem registros de peso no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="date" fontSize={12} stroke="#64748b" />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} fontSize={12} stroke="#64748b" />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} kg`, 'Peso']} />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
