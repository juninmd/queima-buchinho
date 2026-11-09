import './style.css';
import { addWater, clearConfig, fetchToday, isMock, markHabit, mikaChat, mikaLine, saveConfig } from './api';
import { mockToday } from './mock';
import { notify } from './notify';
import { buildReminders, due, nextPending } from './reminders';
import { view, type ViewState } from './view';

const app = document.getElementById('app')!;
const q = new URLSearchParams(location.search);
if (q.has('widget')) document.body.classList.add('widget');
const clock = (): number => (q.get('now') ? Number(q.get('now')) : new Date().getHours() * 60 + new Date().getMinutes());
const st: ViewState = { today: mockToday(), error: '', mika: 'Carregando minha paciência…', chat: [], chatOpen: q.has('chat'), now: clock() };
const val = (id: string): string => (document.getElementById(id) as HTMLInputElement).value;

const render = (): void => { st.now = clock(); app.innerHTML = view(st); };

async function refresh(): Promise<void> {
  try { st.today = await fetchToday(); st.error = ''; } catch (e) { st.error = (e as Error).message; }
  const nxt = nextPending(buildReminders(st.today), clock());
  st.mika = await mikaLine(nxt?.kind ?? 'fechamento');
  render();
}

app.addEventListener('click', async (e) => {
  const el = e.target as HTMLElement;
  if (el.dataset.habit) { await markHabit(el.dataset.habit, true); if (isMock()) st.today.habits[el.dataset.habit] = true; await refresh(); }
  else if (el.dataset.water) { await addWater(250); if (isMock()) st.today.water.ml += 250; await refresh(); }
  else if (el.id === 'save') { saveConfig({ baseUrl: val('url'), token: val('tok') }); await refresh(); }
  else if (el.id === 'reset') { clearConfig(); await refresh(); }
  else if (el.id === 'notif') { const r = nextPending(buildReminders(st.today), 0); if (r) await notify(r); }
  else if (el.id === 'fab') { st.chatOpen = !st.chatOpen; render(); }
  else if (el.id === 'send' && val('msg').trim()) {
    const text = val('msg').trim(); st.chat.push({ me: true, text }); render();
    try { st.chat.push({ me: false, text: await mikaChat(text) }); } catch { st.chat.push({ me: false, text: 'Fora do ar. Nem eu aguento você hoje.' }); }
    render();
  }
});

let last = clock();
setInterval(() => { const now = clock(); due(buildReminders(st.today), last, now).forEach((r) => void notify(r)); last = now; render(); }, 30_000);
setInterval(() => void refresh(), 5 * 60_000);
render(); void refresh();
