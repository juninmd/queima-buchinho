import { useState } from 'react';
import { Header } from '../components/ui/Header';
import { Seg } from '../components/ui/Seg';
import { MeasuresForm } from '../components/MeasuresForm';
import { DailyPanel } from '../pages/DailyPanel';
import { RangePanel } from '../pages/RangePanel';

type View = 'daily' | 'weekly' | 'monthly';

export function Progresso() {
  const [view, setView] = useState<View>('weekly');
  return (
    <>
      <Header eyebrow="Relatório com a Mika" title="Progresso" />
      <Seg label="Período" value={view} onChange={setView}
        options={[{ value: 'daily', label: 'Hoje' }, { value: 'weekly', label: '7 dias' }, { value: 'monthly', label: '30 dias' }]} />
      {view === 'daily' ? <DailyPanel /> : <RangePanel range={view} />}
      <MeasuresForm />
    </>
  );
}
