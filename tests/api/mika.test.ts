import fs from 'fs';
import os from 'os';
import path from 'path';
import { startApi } from './helpers';

const mp3 = path.join(os.tmpdir(), `mika-test-${process.pid}.mp3`);
jest.mock('../../src/services/mika.service', () => ({
  mikaService: { response: jest.fn(async () => ({ message: 'vai treinar', audioSearchTerm: 'x' })) },
}));
jest.mock('../../src/services/tts.service', () => ({
  ttsService: { generateMikaAudio: jest.fn(async () => mp3), cleanup: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../src/services/myinstants.service', () => ({
  myInstantsService: { getBestMatchAudio: jest.fn(async () => ({ title: 'Faustão', audioUrl: 'https://mi.example/a.mp3', url: '' })) },
}));
jest.mock('../../src/services/media.service', () => ({
  mediaService: {
    searchGifs: jest.fn(async () => [{ id: '1', title: 'g', url: 'https://g/1.gif', preview: 'https://g/1p.gif' }]),
    searchStickers: jest.fn(async () => []),
    getRandomGif: jest.fn(async () => 'https://g/random.gif'),
    getRandomSticker: jest.fn(async () => '/local/sticker.webp'),
  },
}));

const { mikaService } = jest.requireMock('../../src/services/mika.service');
const { ttsService } = jest.requireMock('../../src/services/tts.service');
const { myInstantsService } = jest.requireMock('../../src/services/myinstants.service');

describe('rotas da Mika', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { fs.writeFileSync(mp3, 'ID3-fake'); api = await startApi(7); });
  afterAll(async () => { fs.rmSync(mp3, { force: true }); await api.close(); });

  it('chat responde com a fala da Mika e valida a mensagem', async () => {
    expect((await api.call('POST', '/api/mika/chat', { message: 'oi' })).json).toEqual({ message: 'vai treinar' });
    expect(mikaService.response).toHaveBeenCalledWith('oi');
    expect((await api.call('POST', '/api/mika/chat', { message: '' })).json).toEqual({ error: 'invalid_message' });
    expect((await api.call('POST', '/api/mika/chat', { message: 'x'.repeat(501) })).status).toBe(400);
  });

  it('LLM fora do ar vira 503 mika_unavailable', async () => {
    mikaService.response.mockRejectedValueOnce(new Error('down'));
    const res = await api.call('POST', '/api/mika/chat', { message: 'oi' });
    expect(res.status).toBe(503);
    expect(res.json).toEqual({ error: 'mika_unavailable' });
  });

  it('cantada vem da lista do bot', async () => {
    expect((await api.call('GET', '/api/mika/cantada')).json.message.length).toBeGreaterThan(10);
  });

  it('motivar devolve texto e áudio em base64 (e some o arquivo temporário)', async () => {
    const { json } = await api.call('POST', '/api/mika/motivar');
    expect(json.message).toBe('vai treinar');
    expect(Buffer.from(json.audioBase64, 'base64').toString()).toBe('ID3-fake');
    expect(ttsService.cleanup).toHaveBeenCalledWith(mp3);
  });

  it('motivar segue sem áudio se o TTS falhar', async () => {
    ttsService.generateMikaAudio.mockRejectedValueOnce(new Error('tts'));
    expect((await api.call('POST', '/api/mika/motivar')).json).toEqual({ message: 'vai treinar', audioBase64: null });
  });

  it('instante encontra, não encontra e valida o termo', async () => {
    expect((await api.call('GET', '/api/mika/instante?q=faustao')).json).toEqual({ title: 'Faustão', audioUrl: 'https://mi.example/a.mp3' });
    myInstantsService.getBestMatchAudio.mockResolvedValueOnce(null);
    expect((await api.call('GET', '/api/mika/instante?q=nada')).status).toBe(404);
    expect((await api.call('GET', '/api/mika/instante')).json).toEqual({ error: 'invalid_q' });
  });

  it('media busca por termo, sorteia e ignora arquivo local', async () => {
    const byTerm = await api.call('GET', '/api/mika/media?kind=gif&q=academia');
    expect(byTerm.json.items).toEqual([{ url: 'https://g/1.gif', preview: 'https://g/1p.gif', title: 'g' }]);
    expect((await api.call('GET', '/api/mika/media?kind=meme')).json.items[0].url).toBe('https://g/random.gif');
    expect((await api.call('GET', '/api/mika/media?kind=sticker')).json.items).toEqual([]);
    expect((await api.call('GET', '/api/mika/media?kind=video')).json).toEqual({ error: 'invalid_kind' });
    expect((await api.call('GET', '/api/mika/media?kind=constructor')).status).toBe(400);
  });
});
