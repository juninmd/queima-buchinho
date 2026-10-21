export type PushKind = 'ficha' | 'agua' | 'refeicao' | 'fechamento';
export type PushPrefs = Record<PushKind, boolean>;

/** Botão da notificação nativa; `id` chega em /api/push/action. */
export interface PushAction { id: string; title: string }

/** Corpo entregue ao service worker (web) e ao FCM/APNs (app nativo). */
export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  /** Imagem grande (só nativo). */
  image?: string;
  /** Botões rápidos (iOS via categoria; Android abre o app). */
  actions?: PushAction[];
}

export type DevicePlatform = 'android' | 'ios';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const PUSH_KINDS: PushKind[] = ['ficha', 'agua', 'refeicao', 'fechamento'];
export const DEFAULT_PREFS: PushPrefs = { ficha: true, agua: true, refeicao: true, fechamento: true };

/** Só booleans conhecidos entram; o resto cai no padrão (tudo ligado). */
export function normalizePrefs(raw: unknown): PushPrefs {
  const src = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_PREFS };
  for (const kind of PUSH_KINDS) if (typeof src[kind] === 'boolean') out[kind] = src[kind] as boolean;
  return out;
}
