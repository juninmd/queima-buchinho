/// <reference lib="dom" />
import * as THREE from 'three';
import type { LipFrame } from '../lip-sync-track';
import { MikaFace } from './avatar';
import { createBackground } from './background';

interface InitArgs { vrmUrl: string; size: number; fps: number; track: LipFrame[] }

let face: MikaFace;
let args: InitArgs;
let out: CanvasRenderingContext2D;
let glCanvas: HTMLCanvasElement;
let scene: ReturnType<typeof createBackground>;

async function init(a: InitArgs): Promise<void> {
    args = a;
    const outCanvas = document.getElementById('out') as HTMLCanvasElement;
    outCanvas.width = outCanvas.height = a.size;
    out = outCanvas.getContext('2d', { willReadFrequently: true })!;
    scene = createBackground(a.size, a.size);
    glCanvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(a.size, a.size, false);
    renderer.setClearColor(0x000000, 0);
    face = new MikaFace(renderer);
    await face.load(a.vrmUrl);
    face.camera.aspect = 1;
}

/** Renderiza o quadro `i` e devolve um JPEG em base64 (sem o prefixo data:). */
function frame(i: number): string {
    const { fps, size, track } = args;
    const t = i / fps;
    face.pose(t, 1 / fps, track[Math.min(i, track.length - 1)]);
    face.render();
    scene.drawBack(out, t);
    out.drawImage(glCanvas, 0, 0, size, size);
    scene.drawFront(out, t);
    return (out.canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.92).split(',')[1];
}

(window as unknown as { mikaStage: unknown }).mikaStage = { init, frame };
