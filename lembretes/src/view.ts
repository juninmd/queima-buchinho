import { isMock, loadConfig } from './api';
import { buildReminders, nextPending } from './reminders';
import type { Settings } from './settings';
import type { Reminder, Today } from './types';

export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function row(r: Reminder, i: number): string {
  const act = r.done ? '<span class="chk">✓</span>' : r.kind === 'agua' ? `<button data-water="250">+250</button>` : r.kind === 'refeicao' ? `<button class="ok" data-habit="${r.id}">Feito</button>` : '';
  return `<div class="row ${r.done ? 'done' : ''}" style="--i:${i}"><i class="dot ${r.kind}"></i><span class="time">${r.time}</span><span class="main"><b>${esc(r.title)}</b><div>${esc(r.detail)}</div></span>${act}</div>`;
}
const sw = (k: string, on: boolean, label: string): string => `<label class="sw"><input type="checkbox" data-set="${k}" ${on ? 'checked' : ''}><i></i>${label}</label>`;

export interface ViewState { today: Today; error: string; mika: string; chat: { me: boolean; text: string }[]; chatOpen: boolean; now: number; set: Settings }

export function view(s: ViewState): string {
  const list = buildReminders(s.today);
  const nxt = nextPending(list, s.now);
  const done = list.filter((r) => r.done), todo = list.filter((r) => !r.done);
  const pct = Math.min(100, Math.round((s.today.water.ml / s.today.water.goalMl) * 100));
  const cfg = loadConfig();
  const msgs = s.chat.map((m) => `<div class="${m.me ? 'me' : 'ai'}">${esc(m.text)}</div>`).join('');
  return `<div class="wrap">
    <header><div><h1>Lembretes</h1><div class="sub">${s.today.streak} dias seguidos</div></div>
      <span class="badge ${isMock() ? '' : 'live'}">${isMock() ? 'dados de exemplo' : 'API conectada'}</span></header>
    <div class="glass mika"><div class="av">M</div><div><b>Mika</b><p>${esc(s.mika)}</p></div></div>
    <div class="next"><small>Próximo lembrete</small><div class="t">${nxt ? nxt.time : '✓'}</div><div class="n">${nxt ? esc(nxt.title) : 'Tudo em dia hoje'}</div></div>
    <div class="glass"><div class="sub">Água · ${s.today.water.ml} / ${s.today.water.goalMl} ml</div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="glass list">${todo.map((r, i) => row(r, i)).join('') || '<div class="sub">Nada pendente 🎉</div>'}
      ${done.length ? `<button class="fold" data-fold aria-expanded="${!s.set.hideDone}"><span>${done.length} confirmados</span><i>▾</i></button>
      <div class="drawer ${s.set.hideDone ? '' : 'open'}"><div>${done.map((r, i) => row(r, i)).join('')}</div></div>` : ''}</div>
    ${s.chatOpen ? `<div class="glass"><div class="chat">${msgs}</div><input id="msg" placeholder="Fale com a Mika…" /><div class="actions"><button class="ok" id="send">Enviar</button></div></div>` : ''}
    <details class="glass"><summary>Ajustes</summary>
      <div class="sws">${sw('notif', s.set.notif, 'Notificações')}${sw('audio', s.set.audio, 'Áudio da Mika')}${sw('bg', s.set.bg, 'Mika ao fundo')}</div>
      <input id="url" placeholder="https://bot.seucluster.dev" value="${esc(cfg?.baseUrl ?? '')}" />
      <input id="tok" type="password" placeholder="Token (DASHBOARD_TOKEN)" value="${esc(cfg?.token ?? '')}" />
      ${s.error ? `<div class="sub">⚠️ ${esc(s.error)}</div>` : ''}
      <div class="actions"><button id="save" class="ok">Salvar</button><button id="reset">Usar exemplo</button><button id="notif">Testar 🔔</button></div></details>
    <button class="fab" id="fab" aria-label="Falar com a Mika">💬</button></div>`;
}
