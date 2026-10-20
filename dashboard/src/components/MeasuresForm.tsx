import { useState, type FormEvent } from 'react';
import type { MetricType } from '../api/contract';
import { useApp } from '../app/AppProvider';
import { useToast } from '../app/Toast';
import { METRIC_LIMITS } from '../lib/limits';
import { parseDecimal, parseInteger } from '../lib/number';

const FIELDS: { type: MetricType; label: string; ph: string }[] = [
  { type: 'weight', label: 'Peso (kg)', ph: '82,5' },
  { type: 'steps', label: 'Passos', ph: '8000' },
  { type: 'body_fat', label: 'Gordura (%)', ph: '14,5' },
  { type: 'muscle_mass', label: 'Músculo (%)', ph: '42,1' },
  { type: 'height', label: 'Altura (cm)', ph: '175' },
];

export function MeasuresForm() {
  const { logMetric } = useApp();
  const toast = useToast();
  const [values, setValues] = useState<Partial<Record<MetricType, string>>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const entries: [MetricType, number][] = [];
    for (const f of FIELDS) {
      const raw = values[f.type]?.trim();
      if (!raw) continue;
      const n = f.type === 'steps' ? parseInteger(raw) : parseDecimal(raw);
      const lim = METRIC_LIMITS[f.type];
      if (n === null) return toast(`${f.label}: não entendi. Exemplo: ${f.ph}`);
      if (n < lim.min || n > lim.max) return toast(`${f.label}: use entre ${lim.min} e ${lim.max} ${lim.unit}.`);
      entries.push([f.type, n]);
    }
    if (!entries.length) return toast('Preencha ao menos uma medida.');
    for (const [type, n] of entries) await logMetric(type, n);
    setValues({});
  };

  return (
    <form className="card" onSubmit={e => void submit(e)}>
      <h2>Registrar medidas</h2>
      <div className="stats">
        {FIELDS.map(f => (
          <label key={f.type} className="field" htmlFor={`m-${f.type}`}>{f.label}
            <input id={`m-${f.type}`} inputMode="decimal" placeholder={f.ph} value={values[f.type] ?? ''} autoComplete="off"
              onChange={e => setValues(v => ({ ...v, [f.type]: e.target.value }))} />
          </label>
        ))}
      </div>
      <button className="btn primary">Salvar medidas</button>
    </form>
  );
}
