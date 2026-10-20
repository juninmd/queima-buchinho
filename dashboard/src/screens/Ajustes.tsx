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
      <Header eyebrow="Conta e app" title="Ajustes" right={<button className="btn sm" onClick={() => go('hoje')}>Voltar</button>} />
      <section className="card">
        <h2>Instalar no celular</h2>
        {installed ? <p className="sub">App instalado. Abre em tela cheia e funciona sem internet.</p> : (
          <>
            <p className="sub">{ios ? 'No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Abre em tela cheia, funciona sem internet e envia lembretes como o Telegram.'}</p>
            {canPrompt && <button className="btn primary" onClick={() => void install()}>Adicionar à tela inicial</button>}
          </>
        )}
      </section>
      <PushCard />
      <PauseCard />
      <section className="card">
        <h2>Sincronização <small>{online ? 'online' : 'offline'}</small></h2>
        <p className="sub">{pending ? `${pending} ação(ões) aguardando envio.` : 'Tudo sincronizado.'}</p>
        <button className="btn" disabled={!online} onClick={() => void flushQueue().then(refresh)}>Sincronizar agora</button>
      </section>
      <ConnectionCard onSignOut={onSignOut} />
    </>
  );
}
