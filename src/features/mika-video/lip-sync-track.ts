import { loudnessToOpenness, rmsLoudness, estimateFormants, vowelWeights, type VowelWeights } from './lip-sync-vowels';

/** Mesma entrada que o AnalyserNode do mika dá ao lip-sync, calculada offline: 16 kHz, janela de 1024. */
export const SAMPLE_RATE = 16000;
const FFT_SIZE = 1024;
const MIN_DB = -100;
const MAX_DB = -30;
const SMOOTHING = 0.6;

export interface LipFrame { open: number; vowels: VowelWeights }

function fft(re: Float64Array, im: Float64Array): void {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        for (let i = 0; i < n; i += len) {
            for (let k = 0; k < len / 2; k++) {
                const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
                const a = i + k, b = a + len / 2;
                const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
                re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
            }
        }
    }
}

const WINDOW = Float64Array.from({ length: FFT_SIZE }, (_, i) => {
    const a = 0.16, x = i / FFT_SIZE;
    return (1 - a) / 2 - 0.5 * Math.cos(2 * Math.PI * x) + (a / 2) * Math.cos(4 * Math.PI * x);
});

/** Espectro em bytes 0..255, como `getByteFrequencyData` (Blackman + suavização no tempo). */
function byteSpectrum(frame: Float32Array, previous: Float64Array): Uint8Array {
    const re = Float64Array.from(frame, (s, i) => s * WINDOW[i]);
    const im = new Float64Array(FFT_SIZE);
    fft(re, im);
    const bytes = new Uint8Array(FFT_SIZE / 2);
    for (let k = 0; k < bytes.length; k++) {
        const mag = Math.hypot(re[k], im[k]) / FFT_SIZE;
        previous[k] = SMOOTHING * previous[k] + (1 - SMOOTHING) * mag;
        const db = 20 * Math.log10(Math.max(previous[k], 1e-12));
        bytes[k] = Math.max(0, Math.min(255, Math.round(((db - MIN_DB) / (MAX_DB - MIN_DB)) * 255)));
    }
    return bytes;
}

/** Uma entrada por quadro de vídeo; o tempo do quadro é o fim da janela de análise. */
export function buildLipSyncTrack(pcm: Float32Array, fps: number, frames: number): LipFrame[] {
    const prev = new Float64Array(FFT_SIZE / 2);
    return Array.from({ length: frames }, (_, f) => {
        const end = Math.min(pcm.length, Math.round(((f + 1) / fps) * SAMPLE_RATE));
        const win = new Float32Array(FFT_SIZE);
        win.set(pcm.subarray(Math.max(0, end - FFT_SIZE), end), Math.max(0, FFT_SIZE - end));
        const open = loudnessToOpenness(rmsLoudness(win));
        const formants = estimateFormants(byteSpectrum(win, prev), SAMPLE_RATE, FFT_SIZE);
        return { open, vowels: vowelWeights(formants, open) };
    });
}
