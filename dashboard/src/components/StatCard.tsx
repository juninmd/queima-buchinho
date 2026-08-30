type Trend = 'good' | 'bad' | 'neutral';

interface StatCardProps {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  progressPct?: number;
}

export function StatCard({ emoji, label, value, hint, trend = 'neutral', progressPct }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${trend}`}>
      <span className="stat-card__emoji">{emoji}</span>
      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
        {hint && <div className="stat-card__hint">{hint}</div>}
        {progressPct !== undefined && (
          <div className="stat-card__bar" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="stat-card__bar-fill" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
