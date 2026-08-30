import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { MikaAnalysis } from '../components/MikaAnalysis';
import { Skeleton } from '../components/Skeleton';
import type { DailyProgress } from '../types';

const WATER_GOAL_ML = 3000;

export function DailyPanel() {
  const [data, setData] = useState<DailyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDaily().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="panel-error">Erro: {error}</p>;
  if (!data) return <Skeleton cards={5} />;

  const habitsPct = data.habitsTotal ? Math.round((data.habitsCompleted / data.habitsTotal) * 100) : 0;
  const waterPct = Math.round((data.water / WATER_GOAL_ML) * 100);
  const weightTrend = data.weight === null ? 'neutral' : data.weightDiff < 0 ? 'good' : data.weightDiff > 0 ? 'bad' : 'neutral';

  return (
    <>
      <section className="stat-grid">
        <StatCard
          emoji="💧"
          label="Água hoje"
          value={`${data.water} ml`}
          hint={`meta: ${WATER_GOAL_ML} ml`}
          trend={waterPct >= 100 ? 'good' : waterPct >= 50 ? 'neutral' : 'bad'}
          progressPct={waterPct}
        />
        <StatCard
          emoji="⚖️"
          label="Peso"
          value={data.weight ? `${data.weight} kg` : '—'}
          hint={data.weight ? `${data.weightDiff >= 0 ? '+' : ''}${data.weightDiff.toFixed(1)} kg desde o início` : 'sem registro hoje'}
          trend={weightTrend}
        />
        <StatCard emoji="💪" label="Treino hoje" value={data.trained ? 'Feito' : 'Pendente'} trend={data.trained ? 'good' : 'bad'} />
        <StatCard emoji="🔥" label="Streak" value={`${data.streak} dia${data.streak === 1 ? '' : 's'}`} trend={data.streak >= 3 ? 'good' : 'neutral'} />
        <StatCard
          emoji="📋"
          label="Hábitos"
          value={`${data.habitsCompleted}/${data.habitsTotal}`}
          hint={`${habitsPct}% concluído hoje`}
          trend={habitsPct >= 80 ? 'good' : habitsPct >= 40 ? 'neutral' : 'bad'}
          progressPct={habitsPct}
        />
      </section>

      <MikaAnalysis range="daily" />
    </>
  );
}
