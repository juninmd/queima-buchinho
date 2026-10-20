import { beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from '../test/memory-storage';
import { loadChat, saveChat, type ChatMessage } from './chatLog';

describe('histórico do chat', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('começa com a saudação da Mika', () => {
    expect(loadChat()).toHaveLength(1);
  });

  it('não persiste áudio base64 e limita o tamanho', () => {
    const msgs: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, me: true, kind: 'text', text: `m${i}` }));
    msgs.push({ id: 'a', me: false, kind: 'audio', src: 'data:audio/mpeg;base64,AAAA' });
    msgs.push({ id: 'b', me: false, kind: 'audio', src: 'https://x/y.mp3' });
    saveChat(msgs);
    const back = loadChat();
    expect(back).toHaveLength(40);
    expect(back.some(m => m.kind === 'audio' && m.src.startsWith('data:'))).toBe(false);
    expect(back[back.length - 1].id).toBe('b');
  });
});
