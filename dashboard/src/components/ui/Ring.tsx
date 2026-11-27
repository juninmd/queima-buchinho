import { ProgressRing } from '@juninmd/sonido';

export function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  return (
    <ProgressRing value={pct} size={92} thickness={8} label={`${done} de ${total} hábitos`}>
      <b className="ring-count">{done}/{total}</b>
    </ProgressRing>
  );
}
