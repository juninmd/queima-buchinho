const ACTIONS = {
  goto: id => document.getElementById('f-' + id).scrollIntoView({ behavior: 'smooth', block: 'center' }),
  water(ml, el) { S.water += +ml; S.waterLog.push(+ml); toast(frameOf(el), `+${ml} ml registrados`, { act: 'undoWater', label: 'Desfazer' }); },
  undoWater() { S.water -= S.waterLog.pop() || 0; S.toast = null; },
  habit(key) { S.habits[key] = !S.habits[key]; },
  tab(v) { S.habTab = v; },
  range(v) { S.range = +v; },
  load(arg, el) {
    const [k, d] = arg.split('|'); S.loads[k] = Math.max(0, S.loads[k] + +d);
    toast(frameOf(el), `Carga salva: ${kg(S.loads[k])} kg. Volta no próximo treino.`);
  },
  set(arg) { const [k, i] = arg.split('|'); S.sets[k] = S.sets[k] === +i + 1 ? +i : +i + 1; },
  finish(k, el) {
    S.habits[k] = !S.habits[k];
    toast(frameOf(el), S.habits[k] ? (k === 'treino' ? 'Treino registrado. Streak: 7 dias.' : 'Cárdio registrado.') : 'Registro desfeito.');
  },
  reset(_, el) {
    if (!S.confirmReset) { S.confirmReset = true; return; }
    Object.keys(S.habits).forEach(k => (S.habits[k] = false)); S.confirmReset = false;
    toast(frameOf(el), 'Dia zerado. Recomeço bonito, né?');
  },
  chip(kind) {
    const MSG = {
      motivar: { t: '/motivar', r: { audio: true } }, cantada: { t: '/cantada', r: { t: 'Você é tipo supino: sem esforço não tem resultado. Mas eu aprovo o tamanho.' } },
      meme: { t: '/meme', r: { media: '🥲' } }, gif: { t: '/gif academia', r: { media: '🎞️' } },
      sticker: { t: '/sticker', r: { media: '💪' } }, instante: { t: '/instante faustao-errou', r: { audio: true, label: 'faustao-errou.mp3' } },
    }[kind];
    S.chat.push({ me: true, t: MSG.t }, { me: false, ...MSG.r });
  },
  ql(_, el) { /* tratado em FORMS */ },
  pause(n, el) { S.pause = +n; toast(frameOf(el), `Pausado por ${n} dia${n > 1 ? 's' : ''}. Sequência congelada.`); },
  resume(_, el) { S.pause = null; toast(frameOf(el), 'Lembretes de volta. A Mika sentiu sua falta (mentira).'); },
  push(k) { S.push[k] = !S.push[k]; },
  save(_, el) { toast(frameOf(el), 'Medidas salvas'); },
};
const frameOf = el => el.closest('.frame-wrap').id.slice(2);
const FORMS = {
  ql(form, el) {
    const t = form.elements.ql.value.trim(), fr = frameOf(el); if (!t) return;
    let m = t.match(/(?:bebi|tomei)\s+(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i), w = t.match(/pesei\s+(\d+(?:[.,]\d+)?)/i);
    if (m) { const v = parseFloat(m[1].replace(',', '.')), ml = Math.round(m[2].toLowerCase() === 'l' ? v * 1000 : v); ACTIONS.water(ml, el); }
    else if (w) { S.weight = parseFloat(w[1].replace(',', '.')); toast(fr, `Peso ${kg(S.weight)} kg registrado`); }
    else if (/^treinei/i.test(t) && !/n[aã]o|\?/i.test(t)) toast(fr, 'Marcar o treino de hoje como feito?', { act: 'finish', arg: 'treino', label: 'Confirmar' });
    else { S.chat.push({ me: true, t }, { me: false, t: REPLIES[S.chat.length % REPLIES.length] }); toast(fr, 'Mika respondeu na aba Mika'); }
  },
  chat(form) {
    const t = form.elements.msg.value.trim(); if (!t) return;
    S.chat.push({ me: true, t }, { me: false, t: REPLIES[S.chat.length % REPLIES.length] });
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  S.confirmReset = el.dataset.act === 'reset' ? S.confirmReset : false;
  ACTIONS[el.dataset.act](el.dataset.arg, el); render();
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault(); FORMS[f.dataset.form](f, f); render();
});
