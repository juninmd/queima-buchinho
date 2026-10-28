import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromiumPath } from '../../src/features/mika-video/render';

describe('chromiumPath', () => {
    const env = { ...process.env };
    let root: string;
    beforeEach(() => {
        delete process.env.CHROMIUM_PATH;
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
        process.env.PLAYWRIGHT_BROWSERS_PATH = root;
    });
    afterEach(() => { process.env = { ...env }; fs.rmSync(root, { recursive: true, force: true }); });

    const touch = (...parts: string[]) => {
        const f = path.join(root, ...parts);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, '');
        return f;
    };

    it('CHROMIUM_PATH tem prioridade', () => {
        process.env.CHROMIUM_PATH = '/usr/bin/chromium';
        expect(chromiumPath()).toBe('/usr/bin/chromium');
    });

    it('acha o layout atual do Playwright (chrome-linux64)', () => {
        expect(chromiumPath()).toBeUndefined();
        const exe = touch('chromium-1243', 'chrome-linux64', 'chrome');
        expect(chromiumPath()).toBe(exe);
    });

    it('acha o layout antigo (chrome-linux) e prefere a revisão mais nova', () => {
        touch('chromium-1100', 'chrome-linux', 'chrome');
        expect(chromiumPath()).toBe(path.join(root, 'chromium-1100', 'chrome-linux', 'chrome'));
        const novo = touch('chromium-1243', 'chrome-linux64', 'chrome');
        expect(chromiumPath()).toBe(novo);
    });
});
