import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { ToastProvider as SonidoToastProvider, useToast as useSonidoToast } from '@juninmd/sonido';

export interface ToastAction { label: string; run: () => void }
type Show = (text: string, action?: ToastAction) => void;

const ToastContext = createContext<Show>(() => {});
export const useToast = (): Show => useContext(ToastContext);

/** Mantém a assinatura `toast(texto, ação)` do app; a região viva, o timer e o visual são do Sonido. */
function Bridge({ children }: { children: ReactNode }) {
  const push = useSonidoToast();
  const show = useCallback<Show>((text, action) => {
    push({
      title: text,
      duration: 5000,
      action: action ? { label: action.label, onClick: action.run } : undefined,
    });
  }, [push]);
  return <ToastContext.Provider value={show}>{children}</ToastContext.Provider>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <SonidoToastProvider>
      <Bridge>{children}</Bridge>
    </SonidoToastProvider>
  );
}
