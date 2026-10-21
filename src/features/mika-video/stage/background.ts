import { mulberry32 } from './rng';

/**
 * Cenário anime de entardecer: céu em degradê, nuvens em faixas, cidade ao longe, bokeh e pétalas.
 * Tudo que é desfocado nasce uma vez em canvas auxiliares — `ctx.filter` por quadro custava ~1 s em software.
 */
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const wrap = (v: number) => ((v % 1) + 1) % 1;
const layer = (w: number, h: number): Ctx => Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d')!;

function sky(c: Ctx, w: number, h: number): void {
    const g = c.createLinearGradient(0, 0, 0, h * 0.72);
    for (const [at, col] of [[0, '#27235c'], [0.35, '#6a4a9e'], [0.65, '#ef8fb4'], [1, '#ffd6a8']] as const) g.addColorStop(at, col);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sun = c.createRadialGradient(w * 0.72, h * 0.55, 0, w * 0.72, h * 0.55, w * 0.55);
    sun.addColorStop(0, 'rgba(255,248,220,0.95)'); sun.addColorStop(0.15, 'rgba(255,214,168,0.6)'); sun.addColorStop(1, 'rgba(255,170,200,0)');
    c.fillStyle = sun; c.fillRect(0, 0, w, h);
}

function skyline(w: number, h: number, rand: () => number): Ctx {
    const c = layer(w, h), base = h * 0.78, n = 26;
    c.filter = 'blur(2.5px)';
    for (let i = 0; i < n; i++) {
        const bh = (0.07 + rand() * 0.16) * h, x = (i / n) * w, bw = w / n + 3;
        c.fillStyle = '#3a2d6b'; c.fillRect(x, base - bh, bw, bh + h);
        c.fillStyle = 'rgba(255,224,150,0.85)';
        for (let k = 0; k < 8; k++) c.fillRect(x + rand() * bw * 0.8, base - bh + rand() * bh * 0.9, 3, 4);
    }
    const haze = c.createLinearGradient(0, base - h * 0.2, 0, base + h * 0.05);
    haze.addColorStop(0, 'rgba(255,170,200,0)'); haze.addColorStop(1, 'rgba(255,170,200,0.55)');
    c.fillStyle = haze; c.fillRect(0, base - h * 0.2, w, h * 0.3);
    return c;
}

/** Sprite de pétala; `blur` > 0 gera a versão fora de foco, perto da câmera. */
function petalSprite(size: number, blur: number): Ctx {
    const pad = blur * 3, c = layer(size * 2 + pad * 2, size * 2 + pad * 2);
    c.filter = blur ? `blur(${blur}px)` : 'none';
    c.translate(size + pad, size + pad);
    c.fillStyle = 'rgba(255,196,214,0.9)';
    c.beginPath(); c.moveTo(0, -size); c.quadraticCurveTo(size * 0.9, -size * 0.2, 0, size); c.quadraticCurveTo(-size * 0.9, -size * 0.2, 0, -size); c.fill();
    return c;
}

function cloudSprite(w: number): Ctx {
    const c = layer(w + 40, 60);
    c.filter = 'blur(3px)';
    c.fillStyle = 'rgba(255,196,214,0.55)'; c.beginPath(); c.ellipse(20 + w / 2, 24, w / 2, 14, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(140,90,170,0.35)'; c.beginPath(); c.ellipse(30 + w / 2, 36, w * 0.45, 8, 0, 0, TAU); c.fill();
    return c;
}

function vignette(w: number, h: number): Ctx {
    const c = layer(w, h), g = c.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.45, h * 0.75);
    g.addColorStop(0, 'rgba(60,30,100,0)'); g.addColorStop(1, 'rgba(60,30,100,0.5)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    return c;
}

export function createBackground(w: number, h: number) {
    const rand = mulberry32(2026);
    const base = layer(w, h);
    sky(base, w, h);
    base.drawImage(skyline(w, h, rand).canvas, 0, 0);
    const stars = Array.from({ length: 40 }, () => ({ x: rand() * w, y: rand() * h * 0.4, r: 0.6 + rand() * 1.2, ph: rand() * TAU }));
    const clouds = Array.from({ length: 6 }, (_, i) => ({ x: rand(), y: (0.2 + i * 0.07) * h, v: 0.004 + rand() * 0.006, sprite: cloudSprite(w * (0.35 + rand() * 0.3)) }));
    const bokeh = Array.from({ length: 22 }, () => ({ x: rand() * w, y: rand(), r: 14 + rand() * 40, v: 0.01 + rand() * 0.02, rgb: rand() < 0.5 ? '255,170,200' : '255,220,170' }));
    const petals = (n: number, size: number) => Array.from({ length: n }, () => ({ x: rand(), y: rand(), v: 0.05 + rand() * 0.06, rot: rand() * TAU, sp: 0.5 + rand() * 1.5, sway: rand() * TAU, k: size * (0.6 + rand() * 0.8) }));
    const back = petals(14, 9), front = petals(5, 26);
    const small = petalSprite(10, 0), big = petalSprite(28, 5), shade = vignette(w, h);

    const drawPetals = (c: Ctx, list: ReturnType<typeof petals>, sprite: Ctx, ref: number, t: number): void => {
        for (const p of list) {
            const x = wrap(p.x - t * p.v * 0.6) * (w + 80) - 40 + Math.sin(t * p.sp + p.sway) * 22, y = wrap(p.y + t * p.v) * (h + 80) - 40;
            const s = p.k / ref;
            c.save(); c.translate(x, y); c.rotate(p.rot + t * p.sp); c.scale(s, s * (0.62 + 0.38 * Math.cos(t * p.sp * 1.3)));
            c.drawImage(sprite.canvas, -sprite.canvas.width / 2, -sprite.canvas.height / 2);
            c.restore();
        }
    };

    return {
        drawBack(c: Ctx, t: number): void {
            c.drawImage(base.canvas, 0, 0);
            for (const s of stars) { c.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 2 + s.ph)})`; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); }
            for (const k of clouds) c.drawImage(k.sprite.canvas, wrap(k.x + t * k.v) * (w * 1.6) - w * 0.3, k.y);
            c.globalCompositeOperation = 'lighter';
            for (const b of bokeh) {
                const x = b.x + Math.sin(t * 0.4 + b.r) * 14, y = wrap(b.y - t * b.v) * h, g = c.createRadialGradient(x, y, 0, x, y, b.r);
                g.addColorStop(0, `rgba(${b.rgb},0.28)`); g.addColorStop(0.8, `rgba(${b.rgb},0.18)`); g.addColorStop(1, `rgba(${b.rgb},0)`);
                c.fillStyle = g; c.beginPath(); c.arc(x, y, b.r, 0, TAU); c.fill();
            }
            c.globalCompositeOperation = 'source-over';
            drawPetals(c, back, small, 10, t);
        },
        /** Por cima da Mika: pétalas desfocadas bem perto da câmera e vinheta. */
        drawFront(c: Ctx, t: number): void {
            drawPetals(c, front, big, 28, t * 1.3);
            c.drawImage(shade.canvas, 0, 0);
        },
    };
}
