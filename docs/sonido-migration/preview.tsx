import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Button, EmptyState, ProgressBar, Switch } from '@juninmd/sonido';

// Cópias literais de origin/master, só o caminho do import foi ajustado quando necessário.
import { Ring as LegacyRing } from './legacy/Ring';
import { Seg as LegacySeg } from './legacy/Seg';
import { Skeleton as LegacySkeleton } from './legacy/Skeleton';
import { StatCard as LegacyStatCard } from './legacy/StatCard';
import { ToastProvider as LegacyToastProvider, useToast as useLegacyToast } from './legacy/Toast';

// Os mesmos arquivos do app, agora apoiados no Sonido.
import { Ring } from '../../dashboard/src/components/ui/Ring';
import { Seg } from '../../dashboard/src/components/ui/Seg';
import { Skeleton } from '../../dashboard/src/components/Skeleton';
import { StatCard } from '../../dashboard/src/components/StatCard';
import { ToastProvider as AppToastProvider, useToast as useAppToast } from '../../dashboard/src/app/Toast';

const panel: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 12,
  minWidth: 0,
  display: 'grid',
  gap: 10,
  alignContent: 'start',
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  alignItems: 'stretch',
};

const tag = (color: string): React.CSSProperties => ({
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color,
  fontWeight: 700,
});

function Row({ title, hint, before, after }: { title: string; hint: string; before: ReactNode; after: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 14 }}>{title}</h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>{hint}</p>
      </div>
      <div style={grid}>
        <div style={panel}>
          <div style={tag('var(--muted)')}>Antes · componente do dashboard</div>
          {before}
        </div>
        <div style={panel}>
          <div style={tag('var(--accent)')}>Depois · @juninmd/sonido</div>
          {after}
        </div>
      </div>
    </section>
  );
}

function StatCells() {
  return (
    <>
      <LegacyStatCard emoji="💧" label="Água hoje" value="1.800 ml" hint="meta: 3.000 ml" trend="neutral" progressPct={60} />
      <LegacyStatCard emoji="✅" label="Hábitos" value="3/5" hint="60% concluído hoje" trend="neutral" progressPct={60} />
    </>
  );
}

function SonidoStatCells() {
  return (
    <>
      <StatCard emoji="💧" label="Água hoje" value="1.800 ml" hint="meta: 3.000 ml" trend="neutral" progressPct={60} />
      <StatCard emoji="✅" label="Hábitos" value="3/5" hint="60% concluído hoje" trend="neutral" progressPct={60} />
    </>
  );
}

function LegacyToastDemo() {
  return <LegacyToastProvider><LegacyToastTrigger /></LegacyToastProvider>;
}

function LegacyToastTrigger() {
  const toast = useLegacyToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast('Água registrada.', { label: 'Desfazer', run: () => {} });
  }, [toast]);
  return <div className="preview-toast-before" />;
}

function ToastDemo() {
  return <AppToastProvider><ToastTrigger /></AppToastProvider>;
}

function ToastTrigger() {
  const toast = useAppToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast('Água registrada.', { label: 'Desfazer', run: () => {} });
  }, [toast]);
  return <div className="preview-toast-after" />;
}

export function Preview() {
  const [legacyView, setLegacyView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  // A página inteira passa de 400 KB; ?parte=1 e ?parte=2 geram duas capturas completas.
  const part = new URLSearchParams(window.location.search).get('parte');
  const show = (n: number) => part === null || part === String(n);

  return (
    <div style={{ padding: 20, display: 'grid', gap: 14, maxWidth: 1180, margin: '0 auto' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20 }}>Queima Buchinho · trocas de componentes pelo Sonido</h1>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Mesmo conteúdo, tema do app conforme o sistema. À esquerda, o primitivo que o dashboard tinha; à direita, o do design system.
          Dados fictícios.
        </p>
      </header>

      {show(1) && (
        <Row
          title="StatCard → StatTile + ProgressBar"
          hint="Números do resumo diário e de período."
          before={<div className="stat-grid"><StatCells /></div>}
          after={<div className="stat-grid"><SonidoStatCells /></div>}
        />
      )}

      {show(1) && (
        <Row
          title="Seg → Tabs"
          hint="Controle segmentado de Hábitos e Progresso."
          before={<LegacySeg label="Período" value={legacyView} onChange={setLegacyView} options={[{ value: 'daily', label: 'Hoje' }, { value: 'weekly', label: '7 dias' }, { value: 'monthly', label: '30 dias' }]} />}
          after={<Seg label="Período" value={view} onChange={setView} options={[{ value: 'daily', label: 'Hoje' }, { value: 'weekly', label: '7 dias' }, { value: 'monthly', label: '30 dias' }]} />}
        />
      )}

      {show(1) && (
        <Row
          title="Ring → ProgressRing"
          hint="Anel de hábitos concluídos no resumo do dia."
          before={<LegacyRing done={3} total={5} />}
          after={<Ring done={3} total={5} />}
        />
      )}

      {show(1) && (
        <Row
          title="Skeleton"
          hint="Placeholder enquanto o resumo carrega."
          before={<LegacySkeleton cards={2} />}
          after={<Skeleton cards={2} />}
        />
      )}

      {show(1) && (
        <Row
          title="Botões"
          hint="Ações principais, secundárias e destrutivas."
          before={
            <div className="btns">
              <button className="btn primary">Abrir ficha</button>
              <button className="btn">Sincronizar</button>
              <button className="btn danger">Sair</button>
            </div>
          }
          after={
            <div className="btns">
              <Button variant="primary">Abrir ficha</Button>
              <Button variant="secondary">Sincronizar</Button>
              <Button variant="danger">Sair</Button>
            </div>
          }
        />
      )}

      {show(2) && (
        <Row
          title="chips → Badge"
          hint="Status de hábitos, refeições e progresso."
          before={
            <div className="chips-row">
              <span className="chip num">60%</span>
              <span className="chip good">feita</span>
              <span className="chip warn">pendente</span>
            </div>
          }
          after={
            <div className="chips-row">
              <Badge tone="aqua">60%</Badge>
              <Badge tone="success">feita</Badge>
              <Badge tone="warning">pendente</Badge>
            </div>
          }
        />
      )}

      {show(2) && (
        <Row
          title="switch → Switch"
          hint="Preferências de lembrete no aparelho."
          before={
            <div className="row static">
              <span className="grow">Água<br /><small className="sub">Só quando você está abaixo do ritmo do dia</small></span>
              <button className="sw on" role="switch" aria-checked="true" aria-label="Água" />
            </div>
          }
          after={
            <Switch label="Água" description="Só quando você está abaixo do ritmo do dia" checked onChange={() => {}} />
          }
        />
      )}

      {show(2) && (
        <Row
          title="Toast"
          hint="Confirmação com ação de desfazer, dentro do painel para a captura."
          before={<LegacyToastDemo />}
          after={<ToastDemo />}
        />
      )}

      {show(2) && (
        <Row
          title="Estado vazio → EmptyState"
          hint="Gráfico sem registros no período."
          before={<p className="chart-empty">Sem registros de peso no período.</p>}
          after={
            <EmptyState
              icon={<span aria-hidden="true">⚖️</span>}
              title="Sem registros de peso no período."
              description="Registre o peso para ver a evolução."
            />
          }
        />
      )}

      {show(2) && (
        <Row
          title="Barra de água → ProgressBar"
          hint="Meta do dia com o marcador de ritmo preservado."
          before={
            <div className="bar" role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: '60%' }} />
              <u style={{ left: '55%' }} title="Ritmo do dia" />
            </div>
          }
          after={
            <div className="water-progress">
              <ProgressBar value={0.6} label="Água: 60% da meta" tone="aqua" />
              <span className="water-progress__pace" style={{ left: '55%' }} title="Ritmo do dia" aria-hidden="true" />
            </div>
          }
        />
      )}
    </div>
  );
}
