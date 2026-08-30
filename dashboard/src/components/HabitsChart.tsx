import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { DayPoint } from '../types';
import { TOOLTIP_STYLE, formatChartDate } from './chartTheme';

export function HabitsChart({ days }: { days: DayPoint[] }) {
  const data = days.map(d => ({
    date: formatChartDate(d.date),
    pct: d.habitsTotal ? Math.round((d.habitsCompleted / d.habitsTotal) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="date" fontSize={12} stroke="#64748b" />
        <YAxis domain={[0, 100]} fontSize={12} unit="%" stroke="#64748b" />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Hábitos concluídos']} />
        <Area type="monotone" dataKey="pct" stroke="#a855f7" fill="#a855f733" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
