import './style.css';
import { addWater, clearConfig, fetchToday, isMock, markHabit, mikaChat, mikaLine, saveConfig } from './api';
import { mockToday } from './mock';
import { MikaBg } from './mika3d';
import { bindSpeak, notify } from './notify';
import { loadSettings, saveSettings } from './settings';
import { buildReminders, due, nextPending } from './reminders';
import { view, type ViewState } from './view';

const app = document.getElementById('app')!;
const q = new URLSearchParams(location.search);
if (q.has('widget')) document.body.classList.add('widget');
const clock = (): number => (q.get('now') ? Number(q.get('now')) : new Date().getHours() * 60 + new Date().getMinutes());
const st: ViewState = { today: mockToday(), error: '', mika: 'Carregando minha paciência…', chat: [], chatOpen: q.has('chat'), now: clock(), set: loadSettings() };
const val = (id: string): string => (document.getElementById(id) as HTMLInputElement).value;

const canvas = document.createElement('canvas'); canvas.id = 'mika-bg'; document.body.prepend(canvas);
const bg = new MikaBg(canvas); bindSpeak((v) => bg.setSpeaking(v));
const applyBg = (): void => { document.body.classList.toggle("nobg", !st.set.bg); document.body.classList.toggle("hasbg", st.set.bg); };
const render = (): void => { st.now = clock(); app.innerHTML = view(st); applyBg(); };

async function refresh(): Promise<void> {
  try { st.today = await fetchToday(); st.error = ''; } catch (e) { st.error = (e as Error).message; }
  const nxt = nextPending(buildReminders(st.today), clock());
  st.mika = await mikaLine(nxt?.kind ?? 'fechamento');
  render();
}

app.addEventListener('click', async (e) => {
  const el = e.target as HTMLElement;
  const fold = el.closest<HTMLElement>('[data-fold]');
  if (fold) { const k = fold.dataset.fold as 'hideDone' | 'hidePending'; st.set[k] = !st.set[k]; saveSettings(st.set); fold.setAttribute('aria-expanded', String(!st.set[k])); fold.nextElementSibling?.classList.toggle('open', !st.set[k]); }
  else if (el.dataset.habit) { await markHabit(el.dataset.habit, true); if (isMock()) st.today.habits[el.dataset.habit] = true; await refresh(); }
  else if (el.dataset.water) { await addWater(250); if (isMock()) st.today.water.ml += 250; await refresh(); }
  else if (el.id === 'save') { saveConfig({ baseUrl: val('url'), token: val('tok') }); await refresh(); }
  else if (el.id === 'reset') { clearConfig(); await refresh(); }
  else if (el.id === 'notif') { const r = nextPending(buildReminders(st.today), 0); if (r) await notify(r, st.set); }
  else if (el.id === 'fab') { st.chatOpen = !st.chatOpen; render(); }
  else if (el.id === 'send' && val('msg').trim()) {
    const text = val('msg').trim(); st.chat.push({ me: true, text }); render();
    try { st.chat.push({ me: false, text: await mikaChat(text) }); } catch { st.chat.push({ me: false, text: 'Fora do ar. Nem eu aguento você hoje.' }); }
    render();
  }
});

app.addEventListener('change', (e) => { const el = e.target as HTMLInputElement; if (el.dataset.set) { (st.set as unknown as Record<string, boolean>)[el.dataset.set] = el.checked; saveSettings(st.set); applyBg(); } });
bg.start().catch(() => document.body.classList.add('nobg'));
let last = clock();
setInterval(() => { const now = clock(); due(buildReminders(st.today), last, now).forEach((r) => void notify(r, st.set)); last = now; render(); }, 30_000);
setInterval(() => void refresh(), 5 * 60_000);
render(); void refresh();
