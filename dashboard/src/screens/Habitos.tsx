import { useState } from 'react';
import { Badge, Button, EmptyState } from '@juninmd/sonido';
import { useApp } from '../app/AppProvider';
import { Header } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { Seg } from '../components/ui/Seg';
import type { HabitCategory } from '../api/contract';

const CATS: Record<HabitCategory, string> = { fitness: 'Fitness', nutrition: 'Nutrição', wellness: 'Bem-estar' };
type View = 'habitos' | 'cardapio';

export function Habitos() {
  const { today, diet, toggleHabit, resetWorkout } = useApp();
  const [view, setView] = useState<View>('habitos');
  const [confirm, setConfirm] = useState(false);
  if (!today) return <p className="sub">Carregando…</p>;

  const defs = today.habitDefs;
  const done = defs.filter(h => today.habits[h.key]).length;
  const pct = defs.length ? Math.round((done / defs.length) * 100) : 0;

  return (
    <>
      <Header eyebrow={`${done} de ${defs.length} hoje`} title="Hábitos"
        right={<Badge tone={pct >= 70 ? 'success' : 'warning'}>{pct}%</Badge>} />
      <Seg label="Seção" value={view} onChange={setView} options={[{ value: 'habitos', label: 'Hábitos' }, { value: 'cardapio', label: 'Cardápio' }]} />
      {view === 'habitos' ? (
        <>
          {(Object.keys(CATS) as HabitCategory[]).map(cat => (
            <section key={cat} className="group">
              <p className="eyebrow">{CATS[cat]}</p>
              {defs.filter(h => h.category === cat).map(h => (
                <button key={h.key} className={`row ${today.habits[h.key] ? 'done' : ''}`} aria-pressed={!!today.habits[h.key]}
                  onClick={() => void toggleHabit(h.key, !today.habits[h.key])}>
                  <span className="em">{h.emoji}</span><span className="grow">{h.label}</span><span className="tick"><Icon name="check" /></span>
                </button>
              ))}
            </section>
          ))}
          <Button variant={confirm ? 'danger' : 'secondary'}
            onClick={() => { if (confirm) { void resetWorkout(); setConfirm(false); } else setConfirm(true); }}>
            {confirm ? 'Toque de novo para zerar o treino' : 'Zerar o treino de hoje'}
          </Button>
        </>
      ) : (
        <>
          <p className="sub">{diet?.day ?? today.weekday} · plano de queima de gordura</p>
          {diet?.meals.map(m => {
            const def = defs.find(h => h.key === m.key);
            const isDone = !!today.habits[m.key];
            return (
              <article key={m.key} className={`card meal ${isDone ? 'done' : ''}`}>
                <h2>{def?.emoji} {def?.label}<Badge tone={isDone ? 'success' : 'neutral'}>{isDone ? 'feita' : 'pendente'}</Badge></h2>
                <p>{m.text}</p>
                <Button variant={isDone ? 'secondary' : 'primary'} onClick={() => void toggleHabit(m.key, !isDone)}>{isDone ? 'Feita' : 'Marcar como feita'}</Button>
              </article>
            );
          }) ?? (
            <EmptyState
              icon={<span aria-hidden="true">🍽️</span>}
              title="Cardápio indisponível offline."
              description="Conecte para ver o plano do dia."
            />
          )}
        </>
      )}
    </>
  );
}
