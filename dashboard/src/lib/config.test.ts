import { beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from '../test/memory-storage';
import { clearConfig, loadConfig, normalizeBaseUrl, saveConfig } from './config';

describe('configuração da API', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('sem nada salvo nem token de ambiente, não há conexão', () => {
    expect(loadConfig()).toBeNull();
  });

  it('salva normalizando a URL e o token', () => {
    saveConfig({ baseUrl: ' https://api.exemplo.com/// ', token: ' abc ' });
    expect(loadConfig()).toEqual({ baseUrl: 'https://api.exemplo.com', token: 'abc' });
  });

  it('ignora configuração corrompida e permite sair', () => {
    window.localStorage.setItem('qb.config', '{quebrado');
    expect(loadConfig()).toBeNull();
    saveConfig({ baseUrl: 'http://x', token: 't' });
    clearConfig();
    expect(loadConfig()).toBeNull();
  });

  it('normalizeBaseUrl tira barras finais', () => {
    expect(normalizeBaseUrl('http://a.b/')).toBe('http://a.b');
  });
});
