import { usePush } from '../app/usePush';
import type { PushPrefs } from '../api/contract';

const ROWS: { key: keyof PushPrefs; label: string; hint: string }[] = [
  { key: 'ficha', label: 'Ficha às 06:00', hint: 'Segunda a sábado, com a provocação da Mika' },
  { key: 'agua', label: 'Água', hint: 'Só quando você está abaixo do ritmo do dia' },
  { key: 'refeicao', label: 'Refeições', hint: 'Só se ainda não marcou' },
  { key: 'fechamento', label: 'Fechamento às 21:30', hint: 'Relatório do dia' },
];

const NOTE: Record<string, string> = {
  unsupported: 'Este navegador não suporta notificações. Instale o app para ativar.',
  unavailable: 'O servidor ainda não tem as chaves de notificação (VAPID).',
  denied: 'Notificações bloqueadas. Libere nas configurações do navegador.',
};

export function PushCard() {
  const { status, prefs, busy, enable, disable, setPref } = usePush();
  const on = status === 'on';
  return (
    <section className="card">
      <h2>Lembretes <small>{on ? 'ativos neste aparelho' : 'desligados'}</small></h2>
      {NOTE[status] && <p className="sub">{NOTE[status]}</p>}
      {(status === 'off' || on) && (
        <button className={`btn ${on ? '' : 'primary'}`} disabled={busy} onClick={() => void (on ? disable() : enable())}>
          {on ? 'Desligar neste aparelho' : 'Ativar lembretes'}
        </button>
      )}
      {on && ROWS.map(r => (
        <div key={r.key} className="row static">
          <span className="grow">{r.label}<br /><small className="sub">{r.hint}</small></span>
          <button className={`sw ${prefs[r.key] ? 'on' : ''}`} role="switch" aria-checked={prefs[r.key]} aria-label={r.label} onClick={() => void setPref(r.key, !prefs[r.key])} />
        </div>
      ))}
    </section>
  );
}
