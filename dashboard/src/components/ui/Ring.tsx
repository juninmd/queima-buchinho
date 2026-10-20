const R = 38;
const C = 2 * Math.PI * R;

export function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  return (
    <div className="ring" role="img" aria-label={`${done} de ${total} hábitos`}>
      <svg viewBox="0 0 92 92" aria-hidden="true">
        <circle className="tr" cx="46" cy="46" r={R} />
        <circle className="fg" cx="46" cy="46" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <b>{done}/{total}</b>
    </div>
  );
}
