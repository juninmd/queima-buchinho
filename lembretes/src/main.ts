import './style.css';
import { addWater, clearConfig, fetchToday, isMock, markHabit, mikaChat, mikaLine, saveConfig, syncQueue } from './api';
import { last7, loadHistory, record } from './history';
import { loadQueue } from './queue';
import { syncSchedule } from './schedule';
import { dueSnoozed, loadSnoozes, prune, saveSnoozes, snooze } from './snooze';
import { mockToday } from './mock';
import { MikaBg } from './mika3d';
import { bindSpeak, notify } from './notify';
import { loadSettings, saveSettings } from './settings';
import { buildReminders, due, nextPending } from './reminders';
import { checkUpdate } from './update';
import { view, type ViewState } from './view';

const app = document.getElementById('app')!;
const q = new URLSearchParams(location.search);
if (q.has('widget')) document.body.classList.add('widget');
const clock = (): number => (q.get('now') ? Number(q.get('now')) : new Date().getHours() * 60 + new Date().getMinutes());
const st: ViewState = { today: mockToday(), error: '', mika: 'Carregando minha paciência…', chat: [], chatOpen: q.has('chat'), now: clock(), set: loadSettings(), update: null, updating: false, queued: loadQueue().length, hist: last7(loadHistory()) };
let snoozes = loadSnoozes();
let fresh = false; // true após salvar/limpar a conexão: não restaurar o que estava digitado
const val = (id: string): string => (document.getElementById(id) as HTMLInputElement).value;

const canvas = document.createElement('canvas'); canvas.id = 'mika-bg'; document.body.prepend(canvas);
const bg = new MikaBg(canvas); bindSpeak((v) => bg.setSpeaking(v));
const applyBg = (): void => { document.body.classList.toggle("nobg", !st.set.bg); document.body.classList.toggle("hasbg", st.set.bg); };
const FIELDS = ['msg', 'url', 'tok', 'goal'];
/** Re-renderiza sem perder o que o usuário está digitando, o foco nem o painel "Ajustes" aberto. */
const render = (): void => {
  st.now = clock();
  const ae = document.activeElement as HTMLInputElement | null;
  const focus = ae && app.contains(ae) && ae.id ? { id: ae.id, a: ae.selectionStart, b: ae.selectionEnd } : null;
  const typed = FIELDS.map((id) => [id, (document.getElementById(id) as HTMLInputElement | null)?.value] as const);
  const open = document.querySelector('details.glass')?.hasAttribute('open');
  app.innerHTML = view(st);
  if (!fresh) for (const [id, v] of typed) { const el = document.getElementById(id) as HTMLInputElement | null; if (el && v !== undefined) el.value = v; }
  fresh = false;
  if (open) document.querySelector('details.glass')?.setAttribute('open', '');
  if (focus) { const el = document.getElementById(focus.id) as HTMLInputElement | null; el?.focus(); if (el && focus.a !== null) try { el.setSelectionRange(focus.a, focus.b); } catch { /* tipo sem seleção */ } }
  applyBg();
};
setTimeout(() => document.body.classList.add('ready'), 900);

async function refresh(): Promise<void> {
  await syncQueue();
  try { st.today = await fetchToday(); st.error = ''; } catch (e) { st.error = (e as Error).message; }
  st.queued = loadQueue().length;
  const list = buildReminders(st.today);
  if (!isMock() && !st.error) st.hist = last7(record(st.today, list.filter((r) => r.done).length, list.length));
  snoozes = prune(snoozes, clock(), new Set(list.filter((r) => r.done).map((r) => r.id))); saveSnoozes(snoozes);
  void syncSchedule(list, snoozes, st.set.notif);
  const nxt = nextPending(list, clock());
  st.mika = await mikaLine(nxt?.kind ?? 'fechamento');
  render();
}

app.addEventListener('click', async (e) => {
  const el = e.target as HTMLElement;
  const fold = el.closest<HTMLElement>('[data-fold]');
  if (fold) { const k = fold.dataset.fold as 'hideDone' | 'hidePending'; st.set[k] = !st.set[k]; saveSettings(st.set); fold.setAttribute('aria-expanded', String(!st.set[k])); fold.nextElementSibling?.classList.toggle('open', !st.set[k]); }
  else if (el.dataset.snooze) { snoozes = snooze(snoozes, el.dataset.snooze, clock()); saveSnoozes(snoozes); void syncSchedule(buildReminders(st.today), snoozes, st.set.notif); render(); }
  else if (el.dataset.habit) { const q = await markHabit(el.dataset.habit, true); if (isMock() || q) st.today.habits[el.dataset.habit] = true; await refresh(); }
  else if (el.dataset.water) { const q = await addWater(250); if (isMock() || q) st.today.water.ml += 250; await refresh(); }
  else if (el.id === 'save') { saveConfig({ baseUrl: val('url'), token: val('tok') }); fresh = true; await refresh(); }
  else if (el.id === 'reset') { clearConfig(); fresh = true; await refresh(); }
  else if (el.id === 'notif') { const r = nextPending(buildReminders(st.today), 0); if (r) await notify(r, st.set); }
  else if (el.id === 'upd' && st.update?.apply) { st.updating = true; render(); await st.update.apply().catch(() => { st.updating = false; render(); }); }
  else if (el.id === 'fab') { st.chatOpen = !st.chatOpen; render(); }
  else if (el.id === 'send' && val('msg').trim()) {
    const text = val('msg').trim(); st.chat.push({ me: true, text }); render();
    try { st.chat.push({ me: false, text: await mikaChat(text) }); } catch { st.chat.push({ me: false, text: 'Fora do ar. Nem eu aguento você hoje.' }); }
    render();
  }
});

app.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'goal') { st.set.goalMl = Math.max(0, Math.round(Number(el.value) || 0)); saveSettings(st.set); render(); return; }
  if (el.dataset.set === 'notif') void syncSchedule(buildReminders(st.today), snoozes, el.checked);
  if (el.dataset.set) { (st.set as unknown as Record<string, boolean>)[el.dataset.set] = el.checked; saveSettings(st.set); applyBg(); }
});
bg.start().catch(() => document.body.classList.add('nobg'));
let last = clock();
setInterval(() => {
  const now = clock(), list = buildReminders(st.today);
  const snz = new Set(dueSnoozed(snoozes, last, now));
  due(list, last, now).filter((r) => !snoozes[r.id]).concat(list.filter((r) => snz.has(r.id) && !r.done)).forEach((r) => void notify(r, st.set));
  last = now;
  if (!(document.activeElement instanceof HTMLInputElement)) render(); // não interrompe quem está digitando
}, 30_000);
setInterval(() => void refresh(), 5 * 60_000);
render(); void refresh();
void checkUpdate().then((u) => { st.update = u; render(); });
