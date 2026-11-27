import { Skeleton as SonidoSkeleton } from '@juninmd/sonido';

/** O brilho e o anúncio em região viva vêm do Sonido; `cards` só define quantas linhas o resumo ocupa. */
export function Skeleton({ cards }: { cards: number }) {
  return (
    <div className="skeleton-summary">
      <SonidoSkeleton label="Carregando o resumo." media rows={cards * 2} />
    </div>
  );
}
