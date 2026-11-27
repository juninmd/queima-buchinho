import { Button, ProgressBar } from '@juninmd/sonido';
import { useApp } from '../app/AppProvider';
import { fmt } from '../lib/number';

const PRESETS = [200, 300, 500];

export function WaterCard() {
  const { today, logMetric } = useApp();
  if (!today) return null;
  const { ml, goalMl, paceMl } = today.water;
  const pct = Math.min(100, (ml / goalMl) * 100);
  const behind = ml < paceMl;
  const pacePct = Math.min(100, (paceMl / goalMl) * 100);
  return (
    <section className="card" aria-label="Água">
      <h2>Água <small>meta {fmt(goalMl)} ml</small></h2>
      <div className="big">{fmt(ml)} <small>ml</small></div>
      <div className="water-progress">
        <ProgressBar
          value={ml / goalMl}
          label={`Água: ${Math.round(pct)}% da meta`}
          tone={ml >= goalMl ? 'accent' : 'aqua'}
        />
        <span className="water-progress__pace" style={{ left: `${pacePct}%` }} title="Ritmo do dia" aria-hidden="true" />
      </div>
      <p className="sub">{behind ? `Abaixo do ritmo de agora (${fmt(paceMl)} ml). Beba um copo.` : 'No ritmo ou à frente.'}</p>
      <div className="btns">
        {PRESETS.map(v => <Button key={v} variant="secondary" onClick={() => void logMetric('water', v)}>+{v}</Button>)}
      </div>
    </section>
  );
}
