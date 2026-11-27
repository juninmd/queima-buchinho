import { useEffect, useState } from 'react';
import { Button, EmptyState, Skeleton } from '@juninmd/sonido';
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
        <Button className="mika-refresh" size="icon" variant="ghost" onClick={() => load(true)} disabled={loading} aria-label="Gerar nova análise" title="Gerar nova análise">
          ↻
        </Button>
      </div>

      {loading && <Skeleton label="A Mika está pensando." rows={3} />}
      {!loading && error && (
        <EmptyState
          icon={<span aria-hidden="true">⚠️</span>}
          title="A análise não veio."
          description={`Erro: ${error}`}
          action={<Button size="sm" variant="secondary" onClick={() => load(true)}>Tentar de novo</Button>}
        />
      )}
      {!loading && !error && data && <p className="mika-card__message">{data.message}</p>}
    </section>
  );
}
