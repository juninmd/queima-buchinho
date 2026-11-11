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

const ICON: Record<string, string> = {
  ficha: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  refeicao: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-3 5-3 8h3v10"/>',
  agua: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>',
  fechamento: '<path d="M21 12.8A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
};
const icon = (k: string): string => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k] ?? ICON.agua}</svg>`;
const eta = (t: string, now: number): string => { const m = Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) - now; return m <= 0 ? 'agora' : m < 60 ? `em ${m} min` : `em ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };

export interface ViewState { today: Today; error: string; mika: string; chat: { me: boolean; text: string }[]; chatOpen: boolean; now: number; set: Settings; update: import('./update').UpdateInfo | null; updating: boolean }

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
    ${s.update ? `<div class="glass upd"><span>Nova versão <b>${esc(s.update.version)}</b></span>${s.update.kind === 'apk' ? `<a class="ok" href="${esc(s.update.url ?? '#')}" target="_blank" rel="noopener">Baixar APK</a>` : `<button class="ok" id="upd" ${s.updating ? 'disabled' : ''}>${s.updating ? 'Instalando…' : 'Atualizar e reiniciar'}</button>`}</div>` : ''}
    <div class="glass mika"><div class="av">M</div><div><b>Mika</b><p>${esc(s.mika)}</p></div></div>
    ${nxt ? `<div class="next k-${nxt.kind}"><span class="orb o1"></span><span class="orb o2"></span>
      <div class="ico"><span class="ring"></span>${icon(nxt.kind)}</div>
      <div class="ntx"><small>Próximo lembrete</small><div class="t">${nxt.time}</div><div class="n">${esc(nxt.title)}</div></div>
      <span class="eta">${eta(nxt.time, s.now)}</span></div>`
    : `<div class="next k-done"><span class="orb o1"></span><div class="ico">${icon('ficha').replace(/<path[^>]*>/, '<path d="M5 12.5l4.5 4.500L19 7.5"/>')}</div><div class="ntx"><small>Próximo lembrete</small><div class="n big">Tudo em dia hoje</div></div></div>`}
    <div class="glass"><div class="sub">Água · ${s.today.water.ml} / ${s.today.water.goalMl} ml</div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="glass list">
      <div class="sum"><div><b>${list.length}</b> atividades<div class="sub">${done.length} feitas · ${todo.length} pendentes</div></div>
        <div class="ring2" style="--p:${Math.round((done.length / list.length) * 100)}"><span>${Math.round((done.length / list.length) * 100)}%</span></div></div>
      <button class="fold top" data-fold="hidePending" aria-expanded="${!s.set.hidePending}"><span>${todo.length} pendentes</span><i>▾</i></button>
      <div class="drawer ${s.set.hidePending ? '' : 'open'}"><div>${todo.map((r, i) => row(r, i)).join('') || '<div class="sub pad">Nada pendente 🎉</div>'}</div></div>
      ${done.length ? `<button class="fold" data-fold="hideDone" aria-expanded="${!s.set.hideDone}"><span>${done.length} confirmados</span><i>▾</i></button>
      <div class="drawer ${s.set.hideDone ? '' : 'open'}"><div>${done.map((r, i) => row(r, i)).join('')}</div></div>` : ''}</div>
    ${s.chatOpen ? `<div class="glass"><div class="chat">${msgs}</div><input id="msg" placeholder="Fale com a Mika…" /><div class="actions"><button class="ok" id="send">Enviar</button></div></div>` : ''}
    <details class="glass"><summary>Ajustes</summary>
      <div class="sws">${sw('notif', s.set.notif, 'Notificações')}${sw('audio', s.set.audio, 'Áudio da Mika')}${sw('bg', s.set.bg, 'Mika ao fundo')}</div>
      <input id="url" placeholder="https://queima-api.antonio-code.duckdns.org" value="${esc(cfg?.baseUrl ?? 'https://queima-api.antonio-code.duckdns.org')}" />
      <input id="tok" type="password" placeholder="Token (DASHBOARD_TOKEN)" value="${esc(cfg?.token ?? '')}" />
      ${s.error ? `<div class="sub">⚠️ ${esc(s.error)}</div>` : ''}
      <div class="actions"><button id="save" class="ok">Salvar</button><button id="reset">Usar exemplo</button><button id="notif">Testar 🔔</button></div></details>
    <button class="bubble" id="fab" aria-label="Falar com a Mika">💬 Fale comigo</button></div>`;
}
