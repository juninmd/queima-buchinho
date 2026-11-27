import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySonidoTheme } from './sonido';

const root = () => ({ dataset: {} } as unknown as HTMLElement);
const scheme = (light: boolean) => vi.stubGlobal('window', { matchMedia: () => ({ matches: light }) });

afterEach(() => vi.unstubAllGlobals());

describe('applySonidoTheme', () => {
  it('usa o tema canto no escuro', () => {
    scheme(false);
    const el = root();
    applySonidoTheme(el);
    expect(el.dataset.theme).toBe('canto');
  });

  it('usa o tema canto-claro no claro', () => {
    scheme(true);
    const el = root();
    applySonidoTheme(el);
    expect(el.dataset.theme).toBe('canto-claro');
  });
});
