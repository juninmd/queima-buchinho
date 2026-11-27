import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applySonidoTheme } from './lib/sonido';
import '@juninmd/sonido/styles.css';
import './styles.css';
import './styles/app.css';
import './styles/components.css';
import './styles/screens.css';

applySonidoTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
