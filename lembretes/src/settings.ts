export interface Settings { notif: boolean; audio: boolean; bg: boolean; hideDone: boolean; hidePending: boolean; goalMl: number }
const KEY = 'qb.lembretes.settings';
const DEF: Settings = { notif: true, audio: false, bg: true, hideDone: false, hidePending: false, goalMl: 0 };

export function loadSettings(): Settings {
  try { return { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) }; } catch { return { ...DEF }; }
}
export function saveSettings(s: Settings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem storage */ } }
