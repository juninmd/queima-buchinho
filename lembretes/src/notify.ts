import type { Reminder } from './types';

/** Notificação nativa (Tauri) com fallback para a Notification API do navegador. */
export async function notify(r: Reminder): Promise<void> {
  const body = `${r.time} · ${r.detail}`;
  try {
    const n = await import('@tauri-apps/plugin-notification');
    if (!(await n.isPermissionGranted())) await n.requestPermission();
    n.sendNotification({ title: r.title, body });
  } catch {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(r.title, { body });
  }
}
