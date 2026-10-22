import { useEffect } from 'react';
import { api } from '../api/client';
import { isNativeApp, onNotificationAction, serverAction, setupNativeChannels, tabHashOf } from '../lib/native';
import { tabFromHash, type Tab } from './tabs';

/** Liga o app nativo ao backend: abre a aba do toque e executa os botões ("+300 ml", "Já comi"). */
export function useNativeBridge(go: (t: Tab) => void, toast: (text: string) => void, refresh: () => Promise<void>) {
  useEffect(() => {
    if (!isNativeApp()) return;
    let off = () => {};
    let alive = true;
    void (async () => {
      await setupNativeChannels().catch(() => {});
      const stop = await onNotificationAction(({ actionId, data }) => {
        const action = serverAction(actionId, data);
        if (!action) { const hash = tabHashOf(data); if (hash) go(tabFromHash(hash)); return; }
        api.pushAction(action)
          .then(r => { toast(r.message); return refresh(); })
          .catch(() => toast('Não consegui registrar agora. Tenta pelo app.'));
      });
      if (alive) off = stop; else stop();
    })();
    return () => { alive = false; off(); };
  }, [go, toast, refresh]);
}
