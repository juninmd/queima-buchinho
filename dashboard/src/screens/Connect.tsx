import { useState, type FormEvent } from 'react';
import { pollGithubLogin, startGithubLogin, type DeviceStart } from '../api/auth';
import { api } from '../api/client';
import { clearConfig, defaultBaseUrl, normalizeBaseUrl, saveConfig } from '../lib/config';

export function Connect({ onConnected }: { onConnected: () => void }) {
  const [url, setUrl] = useState(defaultBaseUrl());
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [device, setDevice] = useState<DeviceStart | null>(null);

  const githubLogin = async () => {
    setBusy(true);
    setError(null);
    const base = normalizeBaseUrl(url);
    try {
      const d = await startGithubLogin(base);
      setDevice(d);
      const deadline = Date.now() + d.expiresIn * 1000;
      let wait = Math.max(d.interval, 5);
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, wait * 1000));
        const r = await pollGithubLogin(base, d.deviceCode);
        if (r.status === 'slow_down') wait += 5;
        if (r.status === 'ok') { saveConfig({ baseUrl: base, token: r.token }); onConnected(); return; }
      }
      setError('Tempo esgotado. Tente de novo.');
    } catch (err) {
      setError(err instanceof Error && err.message === 'forbidden_user' ? 'Esta conta do GitHub não tem acesso.' : 'Não consegui entrar com o GitHub.');
    } finally { setBusy(false); setDevice(null); }
  };

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
      <p className="sub">Entre com o GitHub para acessar o seu bot.</p>
      <label className="field" htmlFor="c-url">URL da API<input id="c-url" value={url} onChange={e => setUrl(e.target.value)} inputMode="url" autoComplete="off" /></label>
      {device && <p className="sub">Abra <a href={device.verificationUri} target="_blank" rel="noreferrer">{device.verificationUri}</a> e digite o código <strong>{device.userCode}</strong>.</p>}
      {error && <p className="panel-error" role="alert">{error}</p>}
      <button type="button" className="btn primary" disabled={busy || !url.trim()} onClick={() => void githubLogin()}>{device ? 'Aguardando GitHub…' : 'Entrar com GitHub'}</button>
      <details><summary>Usar token manual</summary>
        <label className="field" htmlFor="c-token">Token<input id="c-token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" /></label>
        <button className="btn" disabled={busy || !token.trim()}>Conectar com token</button>
      </details>
    </form>
  );
}
