import { beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from '../test/memory-storage';
import { enqueue, flush, onPendingChange, pendingCount } from './queue';

const retryable = (e: unknown) => e instanceof Error && e.message === 'network';

describe('fila offline', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('guarda chamadas em ordem e avisa quem escuta', () => {
    const seen: number[] = [];
    const off = onPendingChange(n => seen.push(n));
    enqueue({ method: 'PUT', path: '/a' });
    enqueue({ method: 'POST', path: '/b', body: { x: 1 }, key: 'k' });
    off();
    expect(pendingCount()).toBe(2);
    expect(seen).toEqual([1, 2]);
  });

  it('entrega tudo e esvazia a fila', async () => {
    enqueue({ method: 'PUT', path: '/a' });
    enqueue({ method: 'PUT', path: '/b' });
    const sent: string[] = [];
    expect(await flush(async c => { sent.push(c.path); }, retryable)).toBe(2);
    expect(sent).toEqual(['/a', '/b']);
    expect(pendingCount()).toBe(0);
  });

  it('para na falha de rede e mantém o resto para depois', async () => {
    enqueue({ method: 'PUT', path: '/a' });
    enqueue({ method: 'PUT', path: '/b' });
    expect(await flush(async () => { throw new Error('network'); }, retryable)).toBe(0);
    expect(pendingCount()).toBe(2);
  });

  it('descarta item recusado pelo servidor e segue com o próximo', async () => {
    enqueue({ method: 'PUT', path: '/ruim' });
    enqueue({ method: 'PUT', path: '/boa' });
    const sent: string[] = [];
    const n = await flush(async c => { if (c.path === '/ruim') throw new Error('400'); sent.push(c.path); }, retryable);
    expect(n).toBe(1);
    expect(sent).toEqual(['/boa']);
    expect(pendingCount()).toBe(0);
  });

  it('não roda dois flush ao mesmo tempo', async () => {
    enqueue({ method: 'PUT', path: '/a' });
    let calls = 0;
    const slow = async () => { calls++; await new Promise(r => setTimeout(r, 10)); };
    const [a, b] = await Promise.all([flush(slow, retryable), flush(slow, retryable)]);
    expect(a + b).toBe(1);
    expect(calls).toBe(1);
  });
});
