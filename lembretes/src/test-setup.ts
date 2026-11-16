/** localStorage mínimo para rodar os testes em ambiente node. */
const mem = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(),
  } });
}
