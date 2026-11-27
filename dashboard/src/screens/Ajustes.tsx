import { Button } from '@juninmd/sonido';
import { useApp } from '../app/AppProvider';
import { useInstall } from '../app/useInstall';
import { flushQueue } from '../api/client';
import { ConnectionCard } from '../components/ConnectionCard';
import { PauseCard } from '../components/PauseCard';
import { PushCard } from '../components/PushCard';
import { Header } from '../components/ui/Header';

export function Ajustes({ onSignOut }: { onSignOut: () => void }) {
  const { pending, online, refresh, go } = useApp();
  const { installed, canPrompt, ios, install } = useInstall();

  return (
    <>
      <Header eyebrow="Conta e app" title="Ajustes" right={<Button size="sm" variant="secondary" onClick={() => go('hoje')}>Voltar</Button>} />
      <section className="card">
        <h2>Instalar no celular</h2>
        {installed ? <p className="sub">App instalado. Abre em tela cheia e funciona sem internet.</p> : (
          <>
            <p className="sub">{ios ? 'No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Abre em tela cheia, funciona sem internet e envia lembretes como o Telegram.'}</p>
            {canPrompt && <Button variant="primary" onClick={() => void install()}>Adicionar à tela inicial</Button>}
          </>
        )}
      </section>
      <PushCard />
      <PauseCard />
      <section className="card">
        <h2>Sincronização <small>{online ? 'online' : 'offline'}</small></h2>
        <p className="sub">{pending ? `${pending} ação(ões) aguardando envio.` : 'Tudo sincronizado.'}</p>
        <Button variant="secondary" disabled={!online} onClick={() => void flushQueue().then(refresh)}>Sincronizar agora</Button>
      </section>
      <ConnectionCard onSignOut={onSignOut} />
    </>
  );
}
