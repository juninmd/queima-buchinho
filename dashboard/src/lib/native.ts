import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type NativePlatform = 'android' | 'ios';

/** True só dentro do app Android/iOS (Capacitor); no navegador/PWA segue o Web Push. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
export const nativePlatform = (): NativePlatform => (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android');

/** Carrega o plugin só no app nativo: o PWA não paga o peso nem exige o SDK web do Firebase. */
const messaging = async () => (await import('@capacitor-firebase/messaging'));

/** Ids iguais aos de src/features/push/fcm.client.ts (channelOf / categoryOf). */
const CHANNELS = [
  { id: 'qb-ficha', name: 'Ficha de treino', high: true },
  { id: 'qb-agua', name: 'Água', high: false },
  { id: 'qb-refeicao', name: 'Refeições', high: false },
  { id: 'qb-fechamento', name: 'Fechamento do dia', high: true },
];

const CATEGORIES = [
  { id: 'QB_AGUA', actions: [{ id: 'water_200', title: '+200 ml' }, { id: 'water_300', title: '+300 ml' }] },
  { id: 'QB_REFEICAO', actions: [{ id: 'meal_done', title: 'Já comi ✅' }] },
  { id: 'QB_FICHA', actions: [] },
  { id: 'QB_FECHAMENTO', actions: [] },
];

/** Canais (Android) e botões rápidos (iOS). Idempotente: pode rodar a cada abertura. */
export async function setupNativeChannels(): Promise<void> {
  if (nativePlatform() === 'android') {
    const { FirebaseMessaging, Importance, Visibility } = await messaging();
    for (const c of CHANNELS) {
      await FirebaseMessaging.createChannel({
        id: c.id, name: c.name, importance: c.high ? Importance.High : Importance.Default,
        visibility: Visibility.Public, vibration: true, lights: true,
      });
    }
  } else {
    await LocalNotifications.registerActionTypes({ types: CATEGORIES });
  }
}

export async function requestNativePermission(): Promise<boolean> {
  const { receive } = await (await messaging()).FirebaseMessaging.requestPermissions();
  return receive === 'granted';
}

export async function nativeToken(): Promise<string> {
  return (await (await messaging()).FirebaseMessaging.getToken()).token;
}

export const dropNativeToken = async (): Promise<void> => (await messaging()).FirebaseMessaging.deleteToken();

export async function nativePermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
  const { receive } = await (await messaging()).FirebaseMessaging.checkPermissions();
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
}

export interface NativeTap { actionId: string; data: Record<string, string> }

/** Toque na notificação (`actionId` = "tap") ou num botão dela. Devolve a função de cancelar. */
export async function onNotificationAction(cb: (tap: NativeTap) => void): Promise<() => void> {
  const h = await (await messaging()).FirebaseMessaging.addListener('notificationActionPerformed', e =>
    cb({ actionId: e.actionId, data: (e.notification.data ?? {}) as Record<string, string> }));
  return () => { void h.remove(); };
}

/** "meal_done" não sabe a refeição (id fixo no iOS): ela vem da tag `refeicao-<meal>`. */
export function serverAction(actionId: string, data: Record<string, string>): string | null {
  if (actionId === 'meal_done') return data.tag?.startsWith('refeicao-') ? `meal_${data.tag.slice(9)}` : null;
  return /^water_\d+$/.test(actionId) || /^meal_\w+$/.test(actionId) ? actionId : null;
}

/** Deep link do payload (`url`) só vira aba se for um hash interno. */
export const tabHashOf = (data: Record<string, string>): string =>
  typeof data.url === 'string' && data.url.startsWith('/#') ? data.url.slice(1) : '';
