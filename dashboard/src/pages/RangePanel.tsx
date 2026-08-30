import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { MikaAnalysis } from '../components/MikaAnalysis';
import { Skeleton } from '../components/Skeleton';
import { WeightChart } from '../components/WeightChart';
import { WaterChart } from '../components/WaterChart';
import { HabitsChart } from '../components/HabitsChart';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import type { RangeProgress } from '../types';

export function RangePanel({ range }: { range: 'weekly' | 'monthly' }) {
  const [data, setData] = useState<RangeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    const fetcher = range === 'weekly' ? api.getWeekly : api.getMonthly;
    fetcher().then(setData).catch(e => setError(e.message));
  }, [range]);

  if (error) return <p className="panel-error">Erro: {error}</p>;
  if (!data) return <Skeleton cards={4} />;

  const weightDelta = data.weightStart !== null && data.weightEnd !== null
    ? data.weightEnd - data.weightStart
    : null;
  const workoutPct = data.days.length ? Math.round((data.workoutsTrained / data.days.length) * 100) : 0;

  return (
    <>
      <section className="stat-grid">
        <StatCard
          emoji="💪"
          label="Treinos"
          value={`${data.workoutsTrained}/${data.days.length}`}
          trend={workoutPct >= 70 ? 'good' : workoutPct >= 40 ? 'neutral' : 'bad'}
          progressPct={workoutPct}
        />
        <StatCard emoji="💧" label="Média de água" value={`${Math.round(data.avgWater)} ml/dia`} trend={data.avgWater >= 2500 ? 'good' : data.avgWater >= 1500 ? 'neutral' : 'bad'} />
        <StatCard
          emoji="📋"
          label="Hábitos"
          value={`${data.habitsAvgPct}%`}
          hint="média de conclusão"
          trend={data.habitsAvgPct >= 80 ? 'good' : data.habitsAvgPct >= 40 ? 'neutral' : 'bad'}
          progressPct={data.habitsAvgPct}
        />
        <StatCard
          emoji="⚖️"
          label="Evolução do peso"
          value={weightDelta === null ? '—' : `${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
          hint={data.weightStart && data.weightEnd ? `${data.weightStart} kg → ${data.weightEnd} kg` : 'sem registros suficientes'}
          trend={weightDelta === null ? 'neutral' : weightDelta < 0 ? 'good' : weightDelta > 0 ? 'bad' : 'neutral'}
        />
      </section>

      <MikaAnalysis range={range} />

      <section className="chart-block">
        <h3>Evolução do peso</h3>
        <WeightChart days={data.days} />
      </section>

      <section className="chart-block">
        <h3>Ingestão de água</h3>
        <WaterChart days={data.days} />
      </section>

      <section className="chart-block">
        <h3>Conclusão de hábitos</h3>
        <HabitsChart days={data.days} />
      </section>

      <section className="chart-block">
        <h3>Treinos no período</h3>
        <WorkoutCalendar days={data.days} />
      </section>
    </>
  );
}
