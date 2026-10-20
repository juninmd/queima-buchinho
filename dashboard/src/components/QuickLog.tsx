import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { ApiError } from '../api/http';
import { useApp } from '../app/AppProvider';
import { useToast } from '../app/Toast';
import { Icon } from './ui/Icon';

/** Campo de texto livre: "bebi 500ml", "pesei 82,5", "treinei". O resto vai para a Mika. */
export function QuickLog() {
  const { refresh, finish, go } = useApp();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const r = await api.quickLog(t);
      if (r.kind === 'water' || r.kind === 'weight') {
        const { id } = r;
        toast(r.message, { label: 'Desfazer', run: () => { void api.undoMetric(id).then(refresh); } });
        await refresh();
      } else if (r.kind === 'workout' || r.kind === 'cardio') {
        const kind = r.kind === 'workout' ? 'treino' : 'cardio';
        toast(`Marcar ${kind === 'treino' ? 'o treino' : 'o cárdio'} de hoje como feito?`, { label: 'Confirmar', run: () => void finish(kind) });
      } else {
        go('mika', t);
      }
      setText('');
    } catch (err) {
      toast(err instanceof ApiError && err.code === 'invalid_value' ? 'Valor fora da faixa.' : 'Registro rápido precisa de internet.');
    } finally { setBusy(false); }
  };

  return (
    <form className="ql" onSubmit={submit}>
      <label htmlFor="ql" hidden>Registro rápido</label>
      <input id="ql" value={text} onChange={e => setText(e.target.value)} placeholder="bebi 500ml · pesei 82,5 · treinei" autoComplete="off" enterKeyHint="send" />
      <button className="btn primary" disabled={busy} aria-label="Enviar"><Icon name="send" /></button>
    </form>
  );
}
