import { beforeEach, describe, expect, it } from 'vitest';
import './test-setup';
import { enqueue, flushQueue, loadQueue } from './queue';

describe('fila offline', () => {
  beforeEach(() => localStorage.clear());
  it('guarda e envia em ordem', async () => {
    enqueue({ t: 'water', ml: 250 }); enqueue({ t: 'habit', key: 'cafe', done: true });
    const sent: string[] = [];
    expect(await flushQueue(async (op) => { sent.push(op.t); })).toBe(2);
    expect(sent).toEqual(['water', 'habit']); expect(loadQueue()).toEqual([]);
  });
  it('para na primeira falha e mantém o resto', async () => {
    enqueue({ t: 'water', ml: 250 }); enqueue({ t: 'water', ml: 500 });
    let n = 0;
    expect(await flushQueue(async () => { if (n++ === 1) throw new Error('off'); })).toBe(1);
    expect(loadQueue()).toEqual([{ t: 'water', ml: 500 }]);
  });
});
