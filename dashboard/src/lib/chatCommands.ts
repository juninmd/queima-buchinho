export type ChatCommand =
  | { cmd: 'motivar' }
  | { cmd: 'cantada' }
  | { cmd: 'meme' | 'gif' | 'sticker' | 'instante'; arg: string }
  | { cmd: 'chat'; arg: string };

/** Mesmos comandos do Telegram digitados no chat: /gif academia, /instante faustao-errou, /motivar... */
export function parseChatCommand(input: string): ChatCommand {
  const text = input.trim();
  const m = /^\/(motivar|cantada|xaveco|meme|gif|sticker|instante)(?:@\w+)?(?:\s+(.+))?$/i.exec(text);
  if (!m) return { cmd: 'chat', arg: text };
  const name = m[1].toLowerCase();
  const arg = (m[2] ?? '').trim();
  if (name === 'motivar') return { cmd: 'motivar' };
  if (name === 'cantada' || name === 'xaveco') return { cmd: 'cantada' };
  return { cmd: name as 'meme' | 'gif' | 'sticker' | 'instante', arg };
}
