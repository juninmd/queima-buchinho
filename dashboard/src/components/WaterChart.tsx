import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Cell } from 'recharts';
import type { DayPoint } from '../types';
import { TOOLTIP_STYLE, formatChartDate } from './chartTheme';

const DAILY_GOAL_ML = 3000;

export function WaterChart({ days }: { days: DayPoint[] }) {
  const data = days.map(d => ({ date: formatChartDate(d.date), agua: d.water }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="date" fontSize={12} stroke="#64748b" />
        <YAxis fontSize={12} stroke="#64748b" />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} ml`, 'Água']} />
        <ReferenceLine y={DAILY_GOAL_ML} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'meta', fontSize: 11, fill: '#38bdf8' }} />
        <Bar dataKey="agua" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.agua >= DAILY_GOAL_ML ? '#22c55e' : '#0ea5e9'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
