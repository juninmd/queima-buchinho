export type Tab = 'hoje' | 'habitos' | 'treino' | 'progresso' | 'mika' | 'ajustes';

export const NAV_TABS: { key: Exclude<Tab, 'ajustes'>; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'habitos', label: 'Hábitos' },
  { key: 'treino', label: 'Treino' },
  { key: 'progresso', label: 'Progresso' },
  { key: 'mika', label: 'Mika' },
];

const ALL: Tab[] = ['hoje', 'habitos', 'treino', 'progresso', 'mika', 'ajustes'];

/** Aceita `#treino` ou `#/treino`: notificações push abrem o app direto na aba certa. */
export function tabFromHash(hash: string): Tab {
  const key = hash.replace(/^#\/?/, '') as Tab;
  return ALL.includes(key) ? key : 'hoje';
}
