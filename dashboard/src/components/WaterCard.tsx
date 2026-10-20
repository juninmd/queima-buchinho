import { useApp } from '../app/AppProvider';
import { fmt } from '../lib/number';

const PRESETS = [200, 300, 500];

export function WaterCard() {
  const { today, logMetric } = useApp();
  if (!today) return null;
  const { ml, goalMl, paceMl } = today.water;
  const pct = Math.min(100, (ml / goalMl) * 100);
  const behind = ml < paceMl;
  return (
    <section className="card" aria-label="Água">
      <h2>Água <small>meta {fmt(goalMl)} ml</small></h2>
      <div className="big">{fmt(ml)} <small>ml</small></div>
      <div className={`bar ${ml >= goalMl ? 'good' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct}%` }} />
        <u style={{ left: `${Math.min(100, (paceMl / goalMl) * 100)}%` }} title="Ritmo do dia" />
      </div>
      <p className="sub">{behind ? `Abaixo do ritmo de agora (${fmt(paceMl)} ml). Beba um copo.` : 'No ritmo ou à frente.'}</p>
      <div className="btns">
        {PRESETS.map(v => <button key={v} className="btn" onClick={() => void logMetric('water', v)}>+{v}</button>)}
      </div>
    </section>
  );
}
