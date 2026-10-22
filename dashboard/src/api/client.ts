import type { DailyProgress, RangeProgress, DashboardAnalysis, DashboardRange } from '../types';
import type {
  AppToday, Diet, FichaState, MediaItem, MetricResult, MetricType, PushConfig, PushPrefs, PushActionResult, QuickLogResult,
} from './contract';
import { isRetryable, request } from './http';
import { enqueue, flush, newId, type QueuedCall } from '../lib/queue';

const get = <T,>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, { signal });
const post = <T,>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});

/** Resultado de uma escrita que tolera offline: `queued` = guardada para reenvio. */
export type Written<T> = { queued: false; data: T } | { queued: true };

async function write<T>(method: string, path: string, body?: unknown, key?: string): Promise<Written<T>> {
  try {
    return { queued: false, data: await request<T>(method, path, body, { idempotencyKey: key }) };
  } catch (e) {
    if (!isRetryable(e)) throw e;
    enqueue({ method, path, body, key });
    return { queued: true };
  }
}

export const flushQueue = () =>
  flush((c: QueuedCall) => request(c.method, c.path, c.body, { idempotencyKey: c.key }), isRetryable);

export const api = {
  getDaily: () => get<DailyProgress>('/api/dashboard/daily'),
  getWeekly: () => get<RangeProgress>('/api/dashboard/weekly'),
  getMonthly: () => get<RangeProgress>('/api/dashboard/monthly'),
  getAnalysis: (range: DashboardRange, refresh = false) =>
    get<DashboardAnalysis>(`/api/dashboard/analysis?range=${range}${refresh ? '&refresh=1' : ''}`),
  today: (signal?: AbortSignal) => get<AppToday>('/api/app/today', signal),
  ficha: () => get<FichaState>('/api/ficha'),
  diet: () => get<Diet>('/api/diet'),
  setHabit: (key: string, completed: boolean) => write<{ habits: Record<string, boolean> }>('PUT', `/api/habits/${key}`, { completed }),
  logMetric: (type: MetricType, value: number) => write<MetricResult>('POST', '/api/metrics', { type, value }, newId()),
  undoMetric: (id: number) => request<{ deleted: boolean }>('DELETE', `/api/metrics/${id}`),
  quickLog: (text: string) => post<QuickLogResult>('/api/quick-log', { text }),
  adjustLoad: (exerciseKey: string, delta: number) => write<{ loadKg: number }>('POST', '/api/ficha/loads', { exerciseKey, delta }),
  finishWorkout: () => write<{ trained: true }>('POST', '/api/ficha/done'),
  finishCardio: () => write<{ cardioDone: true }>('POST', '/api/ficha/cardio'),
  resetWorkout: () => post<{ ok: true }>('/api/workout/reset'),
  getPause: () => get<{ until: string | null }>('/api/pause'),
  pause: (days: number) => post<{ until: string }>('/api/pause', { days }),
  resume: () => request<{ resumed: boolean }>('DELETE', '/api/pause'),
  chat: (message: string) => post<{ message: string }>('/api/mika/chat', { message }),
  cantada: () => get<{ message: string }>('/api/mika/cantada'),
  motivar: () => post<{ message: string; audioBase64: string | null }>('/api/mika/motivar'),
  instante: (q: string) => get<{ title: string; audioUrl: string }>(`/api/mika/instante?q=${encodeURIComponent(q)}`),
  media: (kind: 'gif' | 'sticker' | 'meme', q = '') =>
    get<{ items: MediaItem[] }>(`/api/mika/media?kind=${kind}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  pushConfig: () => get<PushConfig>('/api/push/config'),
  pushSubscribe: (subscription: PushSubscriptionJSON, prefs?: PushPrefs) => post<{ ok: true }>('/api/push/subscribe', { subscription, prefs }),
  pushPrefs: (endpoint: string, prefs: PushPrefs) => request<{ ok: true }>('PUT', '/api/push/prefs', { endpoint, prefs }),
  pushDevice: (token: string, platform: 'android' | 'ios', prefs?: PushPrefs) => post<{ ok: true }>('/api/push/device', { token, platform, prefs }),
  pushDevicePrefs: (token: string, prefs: PushPrefs) => request<{ ok: true }>('PUT', '/api/push/device/prefs', { token, prefs }),
  pushDeviceRemove: (token: string) => request<{ ok: true }>('DELETE', '/api/push/device', { token }),
  pushAction: (action: string) => post<PushActionResult>('/api/push/action', { action }),
  pushUnsubscribe: (endpoint: string) => request<{ ok: true }>('DELETE', '/api/push/subscribe', { endpoint }),
};
