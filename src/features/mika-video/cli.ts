import path from 'path';
import { ttsService } from '../../services/tts.service';
import { renderMikaVideo } from './render';

/** Uso: bun src/features/mika-video/cli.ts "texto da Mika" [saida.mp4]  |  --audio arquivo.mp3 [saida.mp4] */
async function main(): Promise<void> {
    const [first, ...rest] = process.argv.slice(2);
    if (!first) throw new Error('Informe o texto ou --audio <arquivo>');
    const audioPath = first === '--audio' ? rest.shift()! : await ttsService.generateMikaAudio(first);
    const outPath = path.resolve(rest[0] ?? 'mika-video.mp4');
    const t0 = Date.now();
    const still = process.env.MIKA_VIDEO_STILL;
    const res = await renderMikaVideo({ audioPath, outPath, stillFrame: still ? Number(still) : undefined });
    console.log(`ok ${res.path} — ${res.seconds.toFixed(1)}s de vídeo em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch(e => { console.error(e); process.exit(1); });
