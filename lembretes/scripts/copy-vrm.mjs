// Copia o modelo da Mika do repo (15 MB, fora do git desta pasta) para public/.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
const src = new URL('../../assets/mika/mika.vrm', import.meta.url);
if (existsSync(src)) { mkdirSync(new URL('../public/', import.meta.url), { recursive: true }); copyFileSync(src, new URL('../public/mika.vrm', import.meta.url)); }
