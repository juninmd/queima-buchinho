import { ProgressBar, StatTile } from '@juninmd/sonido';

type Trend = 'good' | 'bad' | 'neutral';

const TONE: Record<Trend, 'success' | 'danger' | 'warning'> = {
  good: 'success',
  bad: 'danger',
  neutral: 'warning',
};

interface StatCardProps {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  progressPct?: number;
}

/** Número do resumo: o valor, o tom e a barra de progresso vêm do Sonido. */
export function StatCard({ emoji, label, value, hint, trend = 'neutral', progressPct }: StatCardProps) {
  return (
    <div className="stat-tile">
      <StatTile
        label={label}
        value={value}
        hint={hint}
        tone={TONE[trend]}
        icon={<span aria-hidden="true">{emoji}</span>}
      />
      {progressPct !== undefined && (
        <ProgressBar
          value={progressPct / 100}
          label={`${label}: ${Math.round(progressPct)}%`}
          tone="accent"
          size="sm"
        />
      )}
    </div>
  );
}
