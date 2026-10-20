/** localStorage em memória para rodar os testes em Node. */
export function installMemoryStorage(): Map<string, string> {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage, location: { origin: 'http://app.test' } };
  return data;
}
