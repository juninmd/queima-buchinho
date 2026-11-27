import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Preview } from '../docs/sonido-migration/preview';
import { applySonidoTheme } from './src/lib/sonido';
import '@juninmd/sonido/styles.css';
import './src/styles.css';
import './src/styles/app.css';
import './src/styles/components.css';
import './src/styles/screens.css';
import '../docs/sonido-migration/preview.css';

applySonidoTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
