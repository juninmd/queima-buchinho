import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './test-setup';
import { loadConfig } from './api';
import { pairWith, parsePairingLink, unpair } from './pairing';
import { pairView } from './view';

const CODE = 'qbp_' + 'a'.repeat(43);
const link = (u: string, c = CODE, v = '1') => `queima://pair?v=${v}&u=${encodeURIComponent(u)}&c=${c}`;

describe('pareamento', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('lê o link do QR e normaliza a URL', () => {
    expect(parsePairingLink(link('https://api.exemplo.com/'))).toEqual({ baseUrl: 'https://api.exemplo.com', code: CODE });
    expect(parsePairingLink(link('http://localhost:8081'))?.baseUrl).toBe('http://localhost:8081');
  });
  it('rejeita QR que não é nosso, http remoto, credenciais na URL e código malformado', () => {
    for (const bad of ['https://evil.com', 'queima://pair?v=2&u=https%3A%2F%2Fa.com&c=' + CODE, link('http://api.exemplo.com'), link('https://u:p@a.com'), link('https://a.com', 'qbp_curto'), link('javascript:alert(1)'), 'lixo'])
      expect(parsePairingLink(bad)).toBeNull();
  });
  it('troca o código pelo token e guarda a conexão', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ token: 'qbd_tok' }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    await pairWith({ baseUrl: 'https://a.com', code: CODE });
    expect(loadConfig()).toEqual({ baseUrl: 'https://a.com', token: 'qbd_tok' });
    expect(f).toHaveBeenCalledWith('https://a.com/auth/pair', expect.objectContaining({ method: 'POST' }));
  });
  it('QR expirado/usado não guarda nada e explica', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(pairWith({ baseUrl: 'https://a.com', code: CODE })).rejects.toThrow('expirado');
    expect(loadConfig()).toBeNull();
  });
  it('desparear revoga no servidor e apaga a conexão mesmo se a rede falhar', async () => {
    localStorage.setItem('qb.lembretes.config', JSON.stringify({ baseUrl: 'https://a.com', token: 'qbd_t' }));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('off'); }));
    await unpair();
    expect(loadConfig()).toBeNull();
  });
  it('tela de pareamento só oferece o scanner (sem campos de URL/senha)', () => {
    const h = pairView('erro <x>');
    expect(h).toContain('id="scan"'); expect(h).not.toContain('<input'); expect(h).not.toContain('<x>');
  });
});
