import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DashboardAnalysis, DashboardRange } from '../types';

export function MikaAnalysis({ range }: { range: DashboardRange }) {
  const [data, setData] = useState<DashboardAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (refresh: boolean) => {
    setLoading(true);
    setError(null);
    api.getAnalysis(range, refresh)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(false); }, [range]);

  return (
    <section className="mika-card">
      <div className="mika-card__head">
        <span className="mika-card__avatar" aria-hidden="true">🐍</span>
        <div>
          <h3>Análise da Mika</h3>
          <span className="mika-card__hint">{loading ? 'pensando...' : data?.fallback ? 'modo offline' : 'gerado por IA'}</span>
        </div>
        <button className="mika-card__refresh" onClick={() => load(true)} disabled={loading} title="Gerar nova análise">
          ↻
        </button>
      </div>

      {loading && (
        <div className="mika-card__skeleton" aria-hidden="true">
          <span /><span /><span />
        </div>
      )}
      {!loading && error && <p className="panel-error">Erro: {error}</p>}
      {!loading && !error && data && <p className="mika-card__message">{data.message}</p>}
    </section>
  );
}
