import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './app/AppProvider';
import { ToastProvider, useToast } from './app/Toast';
import { useNativeBridge } from './app/useNativeBridge';
import { tabFromHash, type Tab } from './app/tabs';
import { NavBar } from './components/ui/NavBar';
import { Ajustes } from './screens/Ajustes';
import { Connect } from './screens/Connect';
import { Habitos } from './screens/Habitos';
import { Hoje } from './screens/Hoje';
import { Mika } from './screens/Mika';
import { Treino } from './screens/Treino';
import { loadConfig } from './lib/config';
import { useSonidoTheme } from './lib/sonido';

// Gráficos (recharts) só carregam quando a aba é aberta: o app abre mais leve.
const Progresso = lazy(() => import('./screens/Progresso').then(m => ({ default: m.Progresso })));

function Screen({ onSignOut }: { onSignOut: () => void }) {
  const { tab, go, online, pending, refresh, today, error } = useApp();
  useNativeBridge(go, useToast(), refresh);
  // Com rede mas sem resposta do bot (fora do ar, token trocado), o cache seguia na tela como se
  // fosse o dia atual, sem nenhum aviso: pode ser o de ontem.
  const stale = online && pending === 0 && error !== null && today !== null;
  return (
    <div className="shell">
      {(!online || pending > 0) && (
        <div className="offline" role="status">{online ? `Sincronizando ${pending} ação(ões)…` : `Sem conexão${pending ? ` · ${pending} na fila` : ''}`}</div>
      )}
      {stale && (
        <div className="offline" role="status">
          Não consegui atualizar · dados salvos de {today.date.split('-').reverse().slice(0, 2).join('/')}{' '}
          <button className="link" onClick={() => void refresh()}>Tentar de novo</button>
        </div>
      )}
      <main className="scr" data-tab={tab}>
        {tab === 'hoje' && <Hoje />}
        {tab === 'habitos' && <Habitos />}
        {tab === 'treino' && <Treino />}
        {tab === 'progresso' && <Suspense fallback={<p className="sub">Carregando…</p>}><Progresso /></Suspense>}
        {tab === 'mika' && <Mika />}
        {tab === 'ajustes' && <Ajustes onSignOut={onSignOut} />}
      </main>
      <NavBar tab={tab} go={go} />
    </div>
  );
}

export function App() {
  useSonidoTheme();
  const [configured, setConfigured] = useState(() => loadConfig() !== null);
  const [tab, setTab] = useState<Tab>(() => tabFromHash(window.location.hash));

  const go = useCallback((t: Tab) => { setTab(t); window.history.replaceState(null, '', `#${t}`); }, []);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <ToastProvider>
      {configured ? (
        <AppProvider tab={tab} go={go}><Screen onSignOut={() => setConfigured(false)} /></AppProvider>
      ) : <Connect onConnected={() => setConfigured(true)} />}
    </ToastProvider>
  );
}
