import type { ReactNode } from 'react';

export function Header({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <header className="top">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      {right}
    </header>
  );
}
