import { readJson, writeJson } from './storage';

const KEY = 'qb.queue';

export interface QueuedCall { id: string; method: string; path: string; body?: unknown; key?: string }
type Sender = (call: QueuedCall) => Promise<unknown>;
type Listener = (pending: number) => void;

const listeners = new Set<Listener>();
let flushing = false;

const load = (): QueuedCall[] => readJson<QueuedCall[]>(KEY, []);
const save = (list: QueuedCall[]): void => { writeJson(KEY, list); listeners.forEach(l => l(list.length)); };

export const pendingCount = (): number => load().length;
export const onPendingChange = (l: Listener): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function enqueue(call: Omit<QueuedCall, 'id'>): QueuedCall {
  const item = { ...call, id: newId() };
  save([...load(), item]);
  return item;
}

/**
 * Reenvia em ordem. Falha de rede para e mantém o resto; resposta de erro do servidor
 * descarta o item (reenviar não adianta) e segue. Retorna quantos foram entregues.
 */
export async function flush(send: Sender, isRetryable: (e: unknown) => boolean): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (let list = load(); list.length > 0; list = load()) {
      try { await send(list[0]); sent++; } catch (e) { if (isRetryable(e)) break; }
      save(load().slice(1));
    }
  } finally { flushing = false; }
  return sent;
}
