import { Button, Switch } from '@juninmd/sonido';
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
  unavailable: 'O servidor ainda não tem as chaves de notificação (VAPID no navegador, FCM no app).',
  denied: 'Notificações bloqueadas. Libere nas configurações do aparelho.',
};

export function PushCard() {
  const { status, prefs, busy, enable, disable, setPref } = usePush();
  const on = status === 'on';
  return (
    <section className="card">
      <h2>Lembretes <small>{on ? 'ativos neste aparelho' : 'desligados'}</small></h2>
      {NOTE[status] && <p className="sub">{NOTE[status]}</p>}
      {(status === 'off' || on) && (
        <Button variant={on ? 'secondary' : 'primary'} loading={busy} onClick={() => void (on ? disable() : enable())}>
          {on ? 'Desligar neste aparelho' : 'Ativar lembretes'}
        </Button>
      )}
      {on && (
        <div className="prefs">
          {ROWS.map(r => (
            <Switch
              key={r.key}
              label={r.label}
              description={r.hint}
              checked={!!prefs[r.key]}
              onChange={v => void setPref(r.key, v)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
