/** Fila offline: ações feitas sem rede ficam guardadas e são reenviadas na próxima sincronização. */
export type Op = { t: 'habit'; key: string; done: boolean } | { t: 'water'; ml: number };
const KEY = 'qb.lembretes.queue';
const MAX = 200;

export function loadQueue(): Op[] {
  try { const q = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Op[]; return Array.isArray(q) ? q : []; } catch { return []; }
}
const save = (q: Op[]): void => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX))); } catch { /* sem storage */ } };
export const enqueue = (op: Op): void => save([...loadQueue(), op]);

/** Envia em ordem; para na primeira falha e mantém o resto. Devolve quantas foram enviadas. */
export async function flushQueue(send: (op: Op) => Promise<void>): Promise<number> {
  const q = loadQueue();
  let sent = 0;
  for (const op of q) {
    try { await send(op); sent++; } catch { break; }
  }
  save(q.slice(sent));
  return sent;
}
