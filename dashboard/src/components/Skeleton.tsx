export function Skeleton({ cards }: { cards: number }) {
  return (
    <section className="stat-grid" aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="stat-card stat-card--skeleton">
          <span className="skeleton-block skeleton-block--emoji" />
          <div className="stat-card__body">
            <span className="skeleton-block skeleton-block--value" />
            <span className="skeleton-block skeleton-block--label" />
          </div>
        </div>
      ))}
    </section>
  );
}
