import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastAction { label: string; run: () => void }
interface ToastState { text: string; action?: ToastAction }
type Show = (text: string, action?: ToastAction) => void;

const ToastContext = createContext<Show>(() => {});
export const useToast = (): Show => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback<Show>((text, action) => {
    window.clearTimeout(timer.current);
    setToast({ text, action });
    timer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.action && (
            <button onClick={() => { toast.action?.run(); setToast(null); }}>{toast.action.label}</button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
