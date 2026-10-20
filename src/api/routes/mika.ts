import fs from 'fs/promises';
import { CANTADAS } from '../../controllers/handlers/fun.handler';
import { mediaService, MediaCategory } from '../../services/media.service';
import { mikaService } from '../../services/mika.service';
import { myInstantsService } from '../../services/myinstants.service';
import { ttsService } from '../../services/tts.service';
import { logger } from '../../utils/logger';
import { getMikaContext } from '../../utils/time';
import { HttpError } from '../http';
import { asObject, reqString } from '../validate';
import type { Router } from '../router';

interface MediaItem { url: string; preview: string; title: string }

const motivarPrompt = (ctx: string): string => `${ctx} Mande uma motivacao curta para o Mestre treinar agora, sarcastica e natural. ` +
  'Adapte ao horario: se for manha, charge matinal; se for tarde, cobranca; se for noite tarde, ironia mas ainda incentivando.';
const RANDOM_CATEGORY: Record<string, MediaCategory> = { gif: 'workout', sticker: 'motivation', meme: 'meme' };

/** Mika fora do ar (LLM) vira 503 em vez de 500: o app mostra "Mika indisponível". */
async function askMika(prompt: string): Promise<string> {
  try {
    return (await mikaService.response(prompt)).message;
  } catch {
    throw new HttpError(503, 'mika_unavailable');
  }
}

async function speak(text: string): Promise<string | null> {
  try {
    const path = await ttsService.generateMikaAudio(text);
    const audio = await fs.readFile(path);
    await ttsService.cleanup(path);
    return audio.toString('base64');
  } catch (e) {
    logger.error('[API] TTS indisponível:', e);
    return null;
  }
}

async function findMedia(kind: string, q: string | null): Promise<MediaItem[]> {
  if (q) {
    const results = kind === 'sticker' ? await mediaService.searchStickers(q, 6) : await mediaService.searchGifs(q, 6);
    return results.map(r => ({ url: r.url, preview: r.preview, title: r.title }));
  }
  const category = RANDOM_CATEGORY[kind];
  const url = kind === 'sticker' ? await mediaService.getRandomSticker(category) : await mediaService.getRandomGif(category);
  // Sem Giphy a mídia vem de arquivo local, que o app não consegue abrir: só URL http(s).
  return url && /^https?:\/\//.test(url) ? [{ url, preview: url, title: kind }] : [];
}

export function mikaRoutes(router: Router): void {
  router
    .add('POST', '/api/mika/chat', async ({ body }) => {
      const message = reqString(asObject(await body()), 'message', 500);
      return { message: await askMika(message) };
    })
    .add('GET', '/api/mika/cantada', async () => ({ message: CANTADAS[Math.floor(Math.random() * CANTADAS.length)] }))
    .add('POST', '/api/mika/motivar', async () => {
      const message = await askMika(motivarPrompt(getMikaContext()));
      return { message, audioBase64: await speak(message) };
    })
    .add('GET', '/api/mika/instante', async ({ url }) => {
      const q = (url.searchParams.get('q') ?? '').trim();
      if (!q || q.length > 80) throw new HttpError(400, 'invalid_q');
      const button = await myInstantsService.getBestMatchAudio(q);
      if (!button?.audioUrl) throw new HttpError(404, 'not_found');
      return { title: button.title, audioUrl: button.audioUrl };
    })
    .add('GET', '/api/mika/media', async ({ url }) => {
      const kind = url.searchParams.get('kind') ?? '';
      if (!Object.keys(RANDOM_CATEGORY).includes(kind)) throw new HttpError(400, 'invalid_kind');
      const q = (url.searchParams.get('q') ?? '').trim();
      if (q.length > 80) throw new HttpError(400, 'invalid_q');
      return { items: await findMedia(kind, q || null) };
    });
}
