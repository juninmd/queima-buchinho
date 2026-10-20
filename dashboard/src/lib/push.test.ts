import { beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from '../test/memory-storage';
import { DEFAULT_PREFS, loadPrefs, savePrefs, urlBase64ToUint8Array } from './push';

describe('push', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('converte base64url da chave VAPID em bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });

  it('preferências começam todas ligadas e persistem', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    savePrefs({ ...DEFAULT_PREFS, agua: false });
    expect(loadPrefs().agua).toBe(false);
    expect(loadPrefs().ficha).toBe(true);
  });
});
