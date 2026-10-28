import { spawn } from 'child_process';
import { build } from 'esbuild';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { chromium } from 'playwright-core';
import { logger } from '../../utils/logger';
import { decodePcm } from './audio';
import { buildLipSyncTrack, SAMPLE_RATE } from './lip-sync-track';

export interface RenderOptions {
    audioPath: string;
    outPath: string;
    /** Lado do vídeo quadrado (videonote do Telegram: até 640). */
    size?: number;
    fps?: number;
    /** Silêncio no fim, para a Mika fechar a boca e respirar antes do corte. */
    tailSeconds?: number;
    /** Cancela o render no próximo quadro (fecha o Chromium e o ffmpeg). */
    signal?: AbortSignal;
    /** Depuração: renderiza só este quadro e grava o JPEG em `outPath`. */
    stillFrame?: number;
}

const HTML = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><canvas id="out"></canvas><script src="/stage.js"></script>';
export const DEFAULT_VRM = path.resolve(__dirname, '../../../assets/mika/mika.vrm');

export function chromiumPath(): string | undefined {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
    if (!fs.existsSync(root)) return undefined;
    for (const dir of fs.readdirSync(root).filter(d => d.startsWith('chromium-')).sort().reverse()) {
        // o Playwright já usou `chrome-linux` e hoje usa `chrome-linux64`
        for (const sub of ['chrome-linux64', 'chrome-linux']) {
            const exe = path.join(root, dir, sub, 'chrome');
            if (fs.existsSync(exe)) return exe;
        }
    }
    return undefined;
}

let bundled: Promise<string> | undefined;

function bundleStage(): Promise<string> {
    bundled ??= bundle();
    return bundled;
}

async function bundle(): Promise<string> {
    const res = await build({ entryPoints: [path.join(__dirname, 'stage/stage.ts')], bundle: true, format: 'iife', platform: 'browser', minify: true, write: false });
    return res.outputFiles[0].text;
}

function serve(js: string, vrmPath: string): Promise<http.Server> {
    const server = http.createServer((req, res) => {
        if (req.url === '/stage.js') { res.setHeader('content-type', 'text/javascript'); res.end(js); }
        else if (req.url === '/model.vrm') fs.createReadStream(vrmPath).pipe(res);
        else { res.setHeader('content-type', 'text/html'); res.end(HTML); }
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function encoder(audioPath: string, outPath: string, fps: number) {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', audioPath,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', outPath]);
    let err = '';
    ff.stderr.on('data', d => { err += d; });
    ff.stdin.on('error', () => {});
    const done = new Promise<void>((resolve, reject) => ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg: ${err.slice(-300)}`))));
    done.catch(() => {}); // evita rejeição solta se o ffmpeg for morto no cancelamento
    return { ff, done };
}

/** Renderiza a Mika falando `audioPath` em close, quadro a quadro, e grava o mp4 (h264 + aac) em `outPath`. */
export async function renderMikaVideo(opts: RenderOptions): Promise<{ path: string; seconds: number }> {
    const { audioPath, outPath, size = 640, fps = 24, tailSeconds = 0.5, stillFrame } = opts;
    const vrmPath = process.env.MIKA_VRM_PATH ?? DEFAULT_VRM;
    if (!fs.existsSync(vrmPath)) throw new Error(`Modelo VRM não encontrado: ${vrmPath} (defina MIKA_VRM_PATH)`);
    const pcm = await decodePcm(audioPath);
    const seconds = pcm.length / SAMPLE_RATE + tailSeconds;
    const frames = Math.ceil(seconds * fps);
    const track = buildLipSyncTrack(pcm, fps, frames);
    const server = await serve(await bundleStage(), vrmPath);
    const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
    const { ff, done } = stillFrame === undefined ? encoder(audioPath, outPath, fps) : { ff: null, done: Promise.resolve() };
    try {
        const page = await browser.newPage({ viewport: { width: size, height: size } });
        page.on('console', m => process.env.MIKA_VIDEO_DEBUG && console.log('[page]', m.text()));
        page.on('crash', () => logger.error('[MikaVideo] página crashou'));
        page.on('pageerror', e => logger.error('[MikaVideo] erro na página:', e));
        await page.goto(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
        await page.evaluate(`mikaStage.init(${JSON.stringify({ vrmUrl: '/model.vrm', size, fps, track })})`);
        if (process.env.MIKA_VIDEO_DEBUG) console.log(new Date().toISOString(), 'init ok, frames', frames);
        for (let i = stillFrame === undefined ? 0 : stillFrame; i < frames; i++) {
            if (opts.signal?.aborted) throw new Error('render cancelado');
            const jpeg = Buffer.from(await page.evaluate<string>(`mikaStage.frame(${i})`), 'base64');
            if (!ff) { fs.writeFileSync(outPath, jpeg); break; }
            if (process.env.MIKA_VIDEO_DEBUG && i % 5 === 0) console.log(new Date().toISOString(), 'frame', i);
            if (ff.stdin.destroyed) break; // ffmpeg morreu: `done` rejeita com o stderr dele
            await new Promise<void>(resolve => ff.stdin.write(jpeg, () => resolve()));
        }
        ff?.stdin.end();
        await done;
    } finally {
        ff?.kill();
        await browser.close();
        server.close();
    }
    return { path: outPath, seconds };
}
