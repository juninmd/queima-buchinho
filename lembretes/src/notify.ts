import { mikaLine } from './api';
import type { Reminder } from './types';

/** Notificação nativa (Tauri) no tom da Mika, com fallback para a Notification API. */
export async function notify(r: Reminder): Promise<void> {
  const body = await mikaLine(r.kind);
  const title = `${r.time} · ${r.title}`;
  try {
    const n = await import('@tauri-apps/plugin-notification');
    if (!(await n.isPermissionGranted())) await n.requestPermission();
    n.sendNotification({ title, body });
  } catch {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  }
}
