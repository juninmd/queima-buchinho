import { describe, expect, it } from 'vitest';
import { parseChatCommand } from './chatCommands';

describe('parseChatCommand', () => {
  it('texto comum vai para a conversa', () => {
    expect(parseChatCommand('  oi mika ')).toEqual({ cmd: 'chat', arg: 'oi mika' });
    expect(parseChatCommand('/desconhecido x')).toEqual({ cmd: 'chat', arg: '/desconhecido x' });
  });
  it('comandos sem argumento', () => {
    expect(parseChatCommand('/motivar')).toEqual({ cmd: 'motivar' });
    expect(parseChatCommand('/xaveco')).toEqual({ cmd: 'cantada' });
  });
  it('comandos com termo, inclusive @bot e caixa alta', () => {
    expect(parseChatCommand('/gif academia hard')).toEqual({ cmd: 'gif', arg: 'academia hard' });
    expect(parseChatCommand('/INSTANTE@buchinho_bot faustao-errou')).toEqual({ cmd: 'instante', arg: 'faustao-errou' });
    expect(parseChatCommand('/meme')).toEqual({ cmd: 'meme', arg: '' });
  });
});
