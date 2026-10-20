import { useState } from 'react';
import { clearConfig, loadConfig, normalizeBaseUrl, saveConfig } from '../lib/config';
import { useToast } from '../app/Toast';

export function ConnectionCard({ onSignOut }: { onSignOut: () => void }) {
  const toast = useToast();
  const cfg = loadConfig();
  const [url, setUrl] = useState(cfg?.baseUrl ?? '');
  const [token, setToken] = useState(cfg?.token ?? '');

  const save = () => {
    if (!/^https?:\/\//.test(normalizeBaseUrl(url)) || !token.trim()) return toast('Informe a URL (http/https) e o token.');
    saveConfig({ baseUrl: url, token });
    toast('Conexão salva. Recarregando…');
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <section className="card">
      <h2>Conexão</h2>
      <label className="field" htmlFor="api-url">URL da API<input id="api-url" value={url} onChange={e => setUrl(e.target.value)} autoComplete="off" /></label>
      <label className="field" htmlFor="api-token">Token<input id="api-token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" /></label>
      <div className="btns">
        <button className="btn primary" onClick={save}>Salvar</button>
        <button className="btn danger" onClick={() => { clearConfig(); onSignOut(); }}>Sair</button>
      </div>
    </section>
  );
}
