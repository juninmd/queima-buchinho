import { useState } from 'react';
import type { FichaExercise } from '../api/contract';
import { fmtKg } from '../lib/number';
import { Icon } from './ui/Icon';

const DELTAS = [-5, -2.5, 2.5, 5];

interface Props {
  ex: FichaExercise;
  done: number;
  onSet: (index: number) => void;
  onLoad: (delta: number) => void;
}

export function ExerciseCard({ ex, done, onSet, onLoad }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <article className="card ex">
      <div className="tile">
        {imgFailed || !ex.img ? <Icon name="treino" /> : <img src={ex.img} alt={ex.aparelho} loading="lazy" onError={() => setImgFailed(true)} />}
      </div>
      <div>
        <h3>{ex.nome}</h3>
        <p className="sub">{ex.aparelho} · {ex.series} × {ex.reps} · {ex.descansoS} s</p>
        <div className="dots">
          {Array.from({ length: ex.series }, (_, i) => (
            <button key={i} className={i < done ? 'on' : ''} aria-label={`Série ${i + 1}`} aria-pressed={i < done} onClick={() => onSet(i)}><Icon name="check" /></button>
          ))}
        </div>
      </div>
      {ex.cargaKg !== null && (
        <div className="stepper">
          {DELTAS.slice(0, 2).map(d => <button key={d} className="btn sm" onClick={() => onLoad(d)}>{fmtKg(d)}</button>)}
          <b>{fmtKg(ex.cargaKg)} kg</b>
          {DELTAS.slice(2).map(d => <button key={d} className="btn sm" onClick={() => onLoad(d)}>+{fmtKg(d)}</button>)}
        </div>
      )}
    </article>
  );
}
