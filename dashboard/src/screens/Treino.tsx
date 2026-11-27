import { Badge, Button } from '@juninmd/sonido';
import { useApp } from '../app/AppProvider';
import { ExerciseCard } from '../components/ExerciseCard';
import { Header } from '../components/ui/Header';

export function Treino() {
  const { today, ficha, sets, toggleSet, adjustLoad, finish } = useApp();
  const plan = ficha?.ficha;
  if (!ficha) return <p className="sub">Carregando ficha…</p>;
  if (!plan) {
    return (<><Header eyebrow={today?.weekday ?? ''} title="Descanso" /><p className="card sub">Sem ficha hoje. Descanse, o músculo cresce fora da academia.</p></>);
  }

  const trained = !!today?.trained || ficha.trained;
  const cardioDone = !!today?.cardioDone || ficha.cardioDone;
  const cardio = plan.exercicios[plan.exercicios.length - 1];
  const lifts = plan.exercicios.slice(0, -1);
  const total = lifts.reduce((a, e) => a + e.series, 0);
  const made = lifts.reduce((a, e) => a + Math.min(sets[e.key] ?? 0, e.series), 0);

  return (
    <>
      <Header eyebrow={`${today?.weekday ?? ''} · ficha das 06:00`} title={plan.titulo} right={<Badge tone="aqua">{made}/{total}</Badge>} />
      <p className="sub">{plan.foco}</p>
      <div className="chips-row"><Badge>{plan.metodo}</Badge><Badge>cárdio depois</Badge>{plan.fase && <Badge tone="violet">Semana {plan.fase.semana}/4 · {plan.fase.nome} · bloco {plan.fase.bloco}</Badge>}</div>
      {plan.fase && <p className="sub">{plan.fase.dica}</p>}
      {lifts.map(e => (
        <ExerciseCard key={e.key} ex={e} done={sets[e.key] ?? 0} onSet={i => toggleSet(e.key, i)} onLoad={d => void adjustLoad(e.key, d)} progredir={!plan.fase?.deload} />
      ))}
      {cardio && (
        <article className="card">
          <h2>{cardio.nome}<Badge tone={cardioDone ? 'success' : 'neutral'}>{cardioDone ? 'feito' : 'pendente'}</Badge></h2>
          <p className="sub">{cardio.aparelho} · {cardio.reps}</p>
        </article>
      )}
      <div className="btns">
        <Button variant={trained ? 'secondary' : 'primary'} disabled={trained} onClick={() => void finish('treino')}>{trained ? 'Treino feito ✓' : 'Treinei'}</Button>
        <Button variant={cardioDone ? 'secondary' : 'primary'} disabled={cardioDone} onClick={() => void finish('cardio')}>{cardioDone ? 'Cárdio feito ✓' : 'Fiz o cárdio'}</Button>
      </div>
    </>
  );
}
