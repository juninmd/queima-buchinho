import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../../utils/logger';
import { chromiumPath, DEFAULT_VRM, renderMikaVideo } from './render';

/** O `sendVideoNote` do Telegram aceita até 60 s; acima disso vai como vídeo comum. */
const VIDEO_NOTE_MAX_SECONDS = 60;
const RENDER_TIMEOUT_MS = Number(process.env.MIKA_VIDEO_TIMEOUT_MS) || 20 * 60 * 1000;
const CHAT_ACTION_MS = 4500;

/** Liga por padrão quando há modelo e Chromium; `MIKA_VIDEO=0` desliga. */
export function isMikaVideoEnabled(): boolean {
    if (['0', 'off', 'false'].includes((process.env.MIKA_VIDEO ?? '').toLowerCase())) return false;
    return fs.existsSync(process.env.MIKA_VRM_PATH ?? DEFAULT_VRM) && !!chromiumPath();
}

// Um render por vez: cada um já usa todos os núcleos em WebGL por software.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Renderiza a Mika falando `audioPath` e envia ao chat (vídeo redondo, ou vídeo comum se passar de 60 s).
 * Nunca lança: devolve `false` quando falha, para o chamador cair no áudio de voz.
 */
export function sendMikaVideo(bot: TelegramBot, chatId: number, audioPath: string): Promise<boolean> {
    const job = queue.then(() => run(bot, chatId, audioPath));
    queue = job.catch(() => undefined);
    return job;
}

async function run(bot: TelegramBot, chatId: number, audioPath: string): Promise<boolean> {
    const outPath = path.join(os.tmpdir(), `mika_video_${Date.now()}.mp4`);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), RENDER_TIMEOUT_MS);
    const action = setInterval(() => bot.sendChatAction(chatId, 'record_video_note').catch(() => {}), CHAT_ACTION_MS);
    try {
        const started = Date.now();
        const { seconds } = await renderMikaVideo({ audioPath, outPath, signal: abort.signal });
        logger.info(`🎬 [MikaVideo] ${seconds.toFixed(1)}s de vídeo renderizados em ${((Date.now() - started) / 1000).toFixed(0)}s`);
        clearInterval(action);
        await bot.sendChatAction(chatId, 'upload_video_note').catch(() => {});
        if (seconds <= VIDEO_NOTE_MAX_SECONDS) await bot.sendVideoNote(chatId, outPath, { length: 640 });
        else await bot.sendVideo(chatId, outPath, { width: 640, height: 640, supports_streaming: true });
        return true;
    } catch (e) {
        logger.error('❌ [MikaVideo] Falha ao gerar/enviar o vídeo da Mika, usando só a voz:', e);
        return false;
    } finally {
        clearTimeout(timeout);
        clearInterval(action);
        fs.promises.unlink(outPath).catch(() => {});
    }
}
