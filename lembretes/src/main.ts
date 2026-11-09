import './style.css';
import { addWater, clearConfig, fetchToday, isMock, loadConfig, markHabit, saveConfig } from './api';
import { notify } from './notify';
import { buildReminders, due, nextPending } from './reminders';
import type { Reminder, Today } from './types';

const app = document.getElementById('app')!;
if (new URLSearchParams(location.search).has('widget')) document.body.classList.add('widget');
let today: Today | null = null;
let error = '';
const nowMin = (): number => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fakeNow = Number(new URLSearchParams(location.search).get('now'));
const clock = (): number => (fakeNow ? Math.round(fakeNow) : nowMin());
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function rowHtml(r: Reminder): string {
  const act = r.done ? '' : r.kind === 'agua' ? `<button data-water="250">+250</button>` : r.kind === 'refeicao' ? `<button class="ok" data-habit="${r.id}">Feito</button>` : '';
  return `<div class="row ${r.done ? 'done' : ''}"><span class="time">${r.time}</span><span class="main"><b>${esc(r.title)}</b><div>${esc(r.detail)}</div></span>${act}</div>`;
}

function render(): void {
  if (!today) { app.innerHTML = `<div class="wrap"><p class="sub">${error || 'Carregando…'}</p></div>`; return; }
  const list = buildReminders(today);
  const nxt = nextPending(list, clock());
  const pct = Math.min(100, Math.round((today.water.ml / today.water.goalMl) * 100));
  const cfg = loadConfig();
  app.innerHTML = `<div class="wrap">
    <header><div><h1>🔥 Lembretes</h1><div class="sub">🔥 ${today.streak} dias seguidos</div></div>
      <span class="badge ${isMock() ? '' : 'live'}">${isMock() ? 'dados de exemplo' : 'API conectada'}</span></header>
    <div class="next"><small>Próximo</small><div class="t">${nxt ? nxt.time : 'Tudo em dia'}</div><div class="n">${nxt ? esc(nxt.title) : 'Nada pendente por hoje 🎉'}</div></div>
    <div class="card"><div class="sub">Água · ${today.water.ml} / ${today.water.goalMl} ml</div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="card">${list.map(rowHtml).join('')}</div>
    <details class="card" ${error ? 'open' : ''}><summary>Conexão com a API ${error ? '⚠️ ' + esc(error) : ''}</summary>
      <input id="url" placeholder="https://bot.seucluster.dev" value="${esc(cfg?.baseUrl ?? '')}" />
      <input id="tok" type="password" placeholder="Token (DASHBOARD_TOKEN)" value="${esc(cfg?.token ?? '')}" />
      <div class="actions"><button id="save" class="ok">Salvar</button><button id="reset">Usar exemplo</button></div></details></div>`;
}

async function refresh(): Promise<void> {
  try { today = await fetchToday(); error = ''; } catch (e) { error = (e as Error).message; today ??= await import('./mock').then((m) => m.mockToday()); }
  render();
}

app.addEventListener('click', async (e) => {
  const el = e.target as HTMLElement;
  if (el.dataset.habit) { await markHabit(el.dataset.habit, true); if (isMock() && today) today.habits[el.dataset.habit] = true; await refresh(); }
  if (el.dataset.water) { await addWater(Number(el.dataset.water)); if (isMock() && today) today.water.ml += 250; await refresh(); }
  if (el.id === 'save') { saveConfig({ baseUrl: (document.getElementById('url') as HTMLInputElement).value, token: (document.getElementById('tok') as HTMLInputElement).value }); today = null; await refresh(); }
  if (el.id === 'reset') { clearConfig(); today = null; await refresh(); }
});

let last = clock();
setInterval(() => {
  if (!today) return;
  const now = clock();
  due(buildReminders(today), last, now).forEach((r) => void notify(r));
  last = now; render();
}, 30_000);
setInterval(() => void refresh(), 5 * 60_000);
void refresh();
