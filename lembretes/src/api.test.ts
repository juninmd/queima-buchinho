import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './test-setup';
import { addWater, fetchToday, loadConfig, saveConfig, syncQueue } from './api';
import { loadQueue } from './queue';

describe('api', () => {
  beforeEach(() => { localStorage.clear(); saveConfig({ baseUrl: 'https://x.test/', token: 't' }); });
  afterEach(() => vi.unstubAllGlobals());
  it('HTTP de erro vira exceção', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(fetchToday()).rejects.toThrow('HTTP 500');
  });
  it('API fora do ar: água vai para a fila e sincroniza depois', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('off'); }));
    expect(await addWater(250)).toBe(true);
    expect(loadQueue()).toHaveLength(1);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    expect(await syncQueue()).toBe(1); expect(loadQueue()).toHaveLength(0);
  });
  it('401 (pareamento revogado) apaga a conexão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(fetchToday()).rejects.toThrow('Pareamento revogado');
    expect(loadConfig()).toBeNull();
  });
  it('sem config usa mock e não enfileira', async () => {
    localStorage.clear();
    expect(await addWater(250)).toBe(false); expect(loadQueue()).toHaveLength(0);
  });
});
