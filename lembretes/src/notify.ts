import { mikaVoice, mikaLine } from './api';
import type { Settings } from './settings';
import type { Reminder } from './types';

let onSpeak: (v: boolean) => void = () => {};
export const bindSpeak = (f: (v: boolean) => void): void => { onSpeak = f; };

export function play(src: string): void {
  const a = new Audio(src);
  a.onplay = () => onSpeak(true); a.onended = a.onerror = () => onSpeak(false);
  void a.play().catch(() => onSpeak(false));
}

/** Notificação nativa (Tauri) no tom da Mika; áudio opcional. Respeita as preferências. */
export async function notify(r: Reminder, s: Settings): Promise<void> {
  const v = s.audio ? await mikaVoice().catch(() => null) : null;
  const body = v?.message ?? (await mikaLine(r.kind));
  if (v?.audio) play(v.audio);
  else if (s.audio && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(body); u.lang = 'pt-BR'; u.pitch = 1.4;
    u.onstart = () => onSpeak(true); u.onend = u.onerror = () => onSpeak(false); speechSynthesis.speak(u);
  }
  if (!s.notif) return;
  const title = `${r.time} · ${r.title}`;
  try {
    const n = await import('@tauri-apps/plugin-notification');
    if (!(await n.isPermissionGranted())) await n.requestPermission();
    n.sendNotification({ title, body });
  } catch {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  }
}
