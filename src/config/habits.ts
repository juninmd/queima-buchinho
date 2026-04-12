export interface HabitDefinition {
  key: string;
  emoji: string;
  label: string;
  category: 'fitness' | 'nutrition' | 'wellness';
}

export const HABITS: HabitDefinition[] = [
  { key: 'treino', emoji: '💪', label: 'Treino', category: 'fitness' },
  { key: 'alongamento', emoji: '🧘', label: 'Along.', category: 'fitness' },
  { key: 'leitura', emoji: '📖', label: 'Leitura', category: 'wellness' },
  { key: 'meditacao', emoji: '🧘‍♀️', label: 'Medit.', category: 'wellness' },
  { key: 'suplemento', emoji: '💊', label: 'Suplem.', category: 'nutrition' },
  { key: 'cafe', emoji: '🍳', label: 'Café', category: 'nutrition' },
  { key: 'almoco', emoji: '🍽️', label: 'Almoço', category: 'nutrition' },
  { key: 'jantar', emoji: '🌙', label: 'Jantar', category: 'nutrition' },
];

export const HABIT_MAP = new Map(HABITS.map(h => [h.key, h]));

export function getProgressBar(completed: number, total: number): string {
  if (total === 0) return '░░░░░░░░░░░░░░░ 0%';
  const percentage = Math.round((completed / total) * 100);
  const filled = Math.round((completed / total) * 15);
  const empty = 15 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentage}%`;
}

export function getHabitsByCategory(category: HabitDefinition['category']): HabitDefinition[] {
  return HABITS.filter(h => h.category === category);
}
