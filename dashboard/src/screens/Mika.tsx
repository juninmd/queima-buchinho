import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { ApiError } from '../api/http';
import { useApp } from '../app/AppProvider';
import { useToast } from '../app/Toast';
import { Header } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { parseChatCommand } from '../lib/chatCommands';
import { loadChat, saveChat, type ChatMessage } from '../lib/chatLog';

const CHIPS = [['/motivar', '🎙️ Motivar'], ['/cantada', '💘 Cantada'], ['/meme', '🖼️ Meme'], ['/gif ', '🎞️ GIF'], ['/sticker ', '✨ Sticker'], ['/instante ', '🔊 Instante']];
const uid = () => Math.random().toString(36).slice(2, 10);

function Bubble({ m }: { m: ChatMessage }) {
  if (m.kind === 'audio') return <div className="b mk"><audio controls src={m.src} preload="none" />{m.caption && <p className="sub">{m.caption}</p>}</div>;
  if (m.kind === 'image') return <div className="b mk"><img className="media" src={m.src} alt={m.caption ?? 'Mídia'} loading="lazy" />{m.caption && <p className="sub">{m.caption}</p>}</div>;
  return <div className={`b ${m.me ? 'me' : 'mk'}`}>{m.text}</div>;
}

export function Mika() {
  const { mikaDraft, clearDraft } = useApp();
  const toast = useToast();
  const [log, setLog] = useState<ChatMessage[]>(loadChat);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const send = useRef<(t: string) => Promise<void>>(async () => {});

  const add = (...msgs: ChatMessage[]) => setLog(prev => { const next = [...prev, ...msgs]; saveChat(next); return next; });
  const reply = (text: string): ChatMessage => ({ id: uid(), me: false, kind: 'text', text });

  send.current = async (raw: string) => {
    const input = raw.trim();
    if (!input || busy) return;
    const c = parseChatCommand(input);
    if ((c.cmd === 'gif' || c.cmd === 'sticker' || c.cmd === 'instante') && !c.arg) { setText(`/${c.cmd} `); return; }
    add({ id: uid(), me: true, kind: 'text', text: input });
    setBusy(true);
    try {
      if (c.cmd === 'chat') add(reply((await api.chat(c.arg)).message));
      else if (c.cmd === 'cantada') add(reply((await api.cantada()).message));
      else if (c.cmd === 'motivar') {
        const r = await api.motivar();
        add(reply(r.message), ...(r.audioBase64 ? [{ id: uid(), me: false as const, kind: 'audio' as const, src: `data:audio/mpeg;base64,${r.audioBase64}` }] : []));
      } else if (c.cmd === 'instante') {
        const r = await api.instante(c.arg);
        add({ id: uid(), me: false, kind: 'audio', src: r.audioUrl, caption: r.title });
      } else {
        const { items } = await api.media(c.cmd, c.arg);
        const pick = items[Math.floor(Math.random() * items.length)];
        add(pick ? { id: uid(), me: false, kind: 'image', src: pick.url, caption: pick.title } : reply('Não achei nada, Lenda. Tenta outro termo.'));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) add(reply('A Mika está fora do ar agora. Tenta mais tarde.'));
      else { add(reply('Fiquei sem sinal aqui. Tenta de novo daqui a pouco.')); toast('A Mika precisa de internet.'); }
    }
    finally { setBusy(false); }
  };

  useEffect(() => { if (mikaDraft) { void send.current(mikaDraft); clearDraft(); } }, [mikaDraft, clearDraft]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [log.length]);

  const submit = (e: FormEvent) => { e.preventDefault(); const t = text; setText(''); void send.current(t); };

  return (
    <div className="mika-screen">
      <Header eyebrow="Ácida, mas fofa" title="Mika" right={<span className="avatar">M</span>} />
      <div className="chat" aria-live="polite">{log.map(m => <Bubble key={m.id} m={m} />)}{busy && <div className="b mk">…</div>}<div ref={end} /></div>
      <div className="composer">
        <div className="chips">{CHIPS.map(([cmd, label]) => <button key={cmd} onClick={() => (cmd.endsWith(' ') ? setText(cmd) : void send.current(cmd))}>{label}</button>)}</div>
        <form className="ql" onSubmit={submit}>
          <label htmlFor="msg" hidden>Mensagem para a Mika</label>
          <input id="msg" value={text} onChange={e => setText(e.target.value)} placeholder="Fala com a Mika ou use /gif termo" autoComplete="off" />
          <button className="btn primary" disabled={busy} aria-label="Enviar"><Icon name="send" /></button>
        </form>
      </div>
    </div>
  );
}
