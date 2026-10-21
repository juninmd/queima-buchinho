import { spawn } from 'child_process';
import { SAMPLE_RATE } from './lip-sync-track';

function run(cmd: string, args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args);
        const out: Buffer[] = [];
        let err = '';
        p.stdout.on('data', d => out.push(d));
        p.stderr.on('data', d => { err += d; });
        p.on('error', reject);
        p.on('close', code => code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`${cmd} saiu com ${code}: ${err.slice(-300)}`)));
    });
}

/** Decodifica qualquer áudio (mp3 do Edge-TTS) para PCM float mono 16 kHz. */
export async function decodePcm(audioPath: string): Promise<Float32Array> {
    const raw = await run('ffmpeg', ['-v', 'error', '-i', audioPath, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-']);
    return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}
