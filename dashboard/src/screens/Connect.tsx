import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { clearConfig, defaultBaseUrl, normalizeBaseUrl, saveConfig } from '../lib/config';

export function Connect({ onConnected }: { onConnected: () => void }) {
  const [url, setUrl] = useState(defaultBaseUrl());
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    saveConfig({ baseUrl: normalizeBaseUrl(url), token });
    try { await api.today(); onConnected(); }
    catch (err) {
      clearConfig();
      setError(err instanceof Error && err.message.startsWith('unauthorized') ? 'Token recusado.' : 'Não consegui falar com a API. Confira a URL.');
    } finally { setBusy(false); }
  };

  return (
    <form className="connect card" onSubmit={e => void submit(e)}>
      <h1>🔥 Queima Buchinho</h1>
      <p className="sub">Conecte o app ao seu bot. O token é o <code>DASHBOARD_TOKEN</code> do servidor e fica só neste aparelho.</p>
      <label className="field" htmlFor="c-url">URL da API<input id="c-url" value={url} onChange={e => setUrl(e.target.value)} inputMode="url" autoComplete="off" /></label>
      <label className="field" htmlFor="c-token">Token<input id="c-token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" /></label>
      {error && <p className="panel-error" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy || !token.trim()}>{busy ? 'Conectando…' : 'Conectar'}</button>
    </form>
  );
}
