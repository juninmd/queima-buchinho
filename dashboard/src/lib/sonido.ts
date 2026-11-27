import { useEffect } from 'react';

const LIGHT = '(prefers-color-scheme: light)';

/**
 * O app pinta o tema pelo `prefers-color-scheme`; o Sonido lê `data-theme`.
 * "canto" e "canto-claro" são os temas do Sonido com os mesmos verdes e cinzas do dashboard.
 */
export function applySonidoTheme(root: HTMLElement = document.documentElement): void {
  root.dataset.theme = window.matchMedia(LIGHT).matches ? 'canto-claro' : 'canto';
}

/** Mantém `data-theme` sincronizado quando o sistema troca entre claro e escuro. */
export function useSonidoTheme(): void {
  useEffect(() => {
    const mq = window.matchMedia(LIGHT);
    const sync = () => applySonidoTheme();
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
}
