import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../app/AppProvider';
import { useToast } from '../app/Toast';

const DAYS = [1, 3, 7, 30];
const br = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

export function PauseCard() {
  const { refresh } = useApp();
  const toast = useToast();
  const [until, setUntil] = useState<string | null>(null);

  useEffect(() => { api.getPause().then(r => setUntil(r.until)).catch(() => {}); }, []);

  const pause = async (days: number) => {
    try { const r = await api.pause(days); setUntil(r.until); toast(`Pausado até ${br(r.until)}. Sequência congelada.`); await refresh(); }
    catch { toast('Não consegui pausar agora.'); }
  };
  const resume = async () => {
    try { await api.resume(); setUntil(null); toast('Lembretes de volta.'); await refresh(); }
    catch { toast('Não consegui retomar agora.'); }
  };

  return (
    <section className={`card ${until ? 'pause' : ''}`}>
      <h2>Pausa <small>{until ? `ativa até ${br(until)}` : 'desativada'}</small></h2>
      <p className="sub">Sem lembretes nem cobranças. A sequência de treinos fica congelada.</p>
      <div className="btns">{DAYS.map(d => <button key={d} className="btn sm" onClick={() => void pause(d)}>{d} {d === 1 ? 'dia' : 'dias'}</button>)}</div>
      {until && <button className="btn" onClick={() => void resume()}>Voltar agora</button>}
    </section>
  );
}
