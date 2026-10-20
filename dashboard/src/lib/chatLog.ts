import { readJson, writeJson } from './storage';

const KEY = 'qb.chat';
const LIMIT = 40;

export type ChatMessage =
  | { id: string; me: boolean; kind: 'text'; text: string }
  | { id: string; me: false; kind: 'audio'; src: string; caption?: string }
  | { id: string; me: false; kind: 'image'; src: string; caption?: string };

export const loadChat = (): ChatMessage[] =>
  readJson<ChatMessage[]>(KEY, [{ id: 'hello', me: false, kind: 'text', text: 'Oi. Vai falar comigo ou vai treinar?' }]);

/** Áudio em base64 não vai para o localStorage: estoura a cota e só vale na sessão. */
export function saveChat(list: ChatMessage[]): void {
  const slim = list.filter(m => !(m.kind === 'audio' && m.src.startsWith('data:'))).slice(-LIMIT);
  writeJson(KEY, slim);
}
