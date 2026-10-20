import { useApp } from '../app/AppProvider';
import { Header } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { Ring } from '../components/ui/Ring';
import { MikaAnalysis } from '../components/MikaAnalysis';
import { WaterCard } from '../components/WaterCard';
import { QuickLog } from '../components/QuickLog';
import { Skeleton } from '../components/Skeleton';
import { fmtKg } from '../lib/number';

export function Hoje() {
  const { today, error, go, ficha, diet, toggleHabit } = useApp();
  if (!today) return error ? <p className="panel-error">Erro: {error}</p> : <Skeleton cards={4} />;

  const done = today.habitDefs.filter(h => today.habits[h.key]).length;
  const plan = ficha?.ficha;
  const nextMeal = diet?.meals.find(m => !today.habits[m.key]);
  const mealLabel = today.habitDefs.find(h => h.key === nextMeal?.key)?.label;

  return (
    <>
      <Header eyebrow={today.weekday} title="Hoje"
        right={<button className="icon-btn" aria-label="Abrir ajustes" onClick={() => go('ajustes')}><Icon name="gear" /></button>} />
      {today.pauseUntil && (
        <div className="card pause"><b>Pausa ativa até {today.pauseUntil.split('-').reverse().slice(0, 2).join('/')}</b>
          <p className="sub">Sem lembretes. Sequência congelada.</p></div>
      )}
      <section className="card hero" aria-label="Resumo do dia">
        <Ring done={done} total={today.habitDefs.length} />
        <div className="stats">
          <div className="stat"><b>{today.streak} {today.streak === 1 ? 'dia' : 'dias'}</b><span>sequência de treino</span></div>
          <div className="stat"><b>{today.weight ? `${fmtKg(today.weight)} kg` : '—'}</b><span>{today.weight ? 'peso de hoje' : 'sem peso hoje'}</span></div>
        </div>
      </section>
      <MikaAnalysis range="daily" />
      <WaterCard />
      <QuickLog />
      <section className="card">
        <h2>Treino de hoje <small>{plan ? `${plan.exercicios.length - 1} exercícios + cárdio` : 'descanso'}</small></h2>
        {plan ? (
          <>
            <div className={`row ${today.trained ? 'done' : ''}`}><span className="em">{plan.emoji}</span>
              <span className="grow">{plan.titulo}<br /><small className="sub">{plan.foco}</small></span><span className="tick"><Icon name="check" /></span></div>
            <button className="btn primary" onClick={() => go('treino')}>{today.trained ? 'Ver ficha' : 'Abrir ficha'}</button>
          </>
        ) : <p className="sub">Hoje é descanso. Vá dormir.</p>}
      </section>
      {nextMeal && (
        <section className="card meal"><h2>Próxima refeição <small>{mealLabel}</small></h2><p>{nextMeal.text}</p>
          <button className="btn" onClick={() => void toggleHabit(nextMeal.key, true)}>Marcar como feita</button></section>
      )}
    </>
  );
}
