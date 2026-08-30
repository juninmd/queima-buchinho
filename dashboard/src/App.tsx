import { useState } from 'react';
import { DailyPanel } from './pages/DailyPanel';
import { RangePanel } from './pages/RangePanel';

type Tab = 'daily' | 'weekly' | 'monthly';

const TABS: { key: Tab; label: string }[] = [
  { key: 'daily', label: '📅 Diário' },
  { key: 'weekly', label: '📆 Semanal' },
  { key: 'monthly', label: '🗓️ Mensal' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('daily');

  return (
    <main className="app">
      <header className="app__header">
        <h1>🔥 Queima Buchinho — Progresso</h1>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tabs__button ${tab === t.key ? 'is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'daily' && <DailyPanel />}
      {tab === 'weekly' && <RangePanel range="weekly" />}
      {tab === 'monthly' && <RangePanel range="monthly" />}
    </main>
  );
}
