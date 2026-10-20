const S = {
  habits: { treino: false, cardio: false, alongamento: true, leitura: false, meditacao: false, fio_dental: true,
    suplemento: true, cafe: true, almoco: false, cafe_tarde: false, jantar: false, sem_acucar: true },
  water: 1200, waterLog: [1200], weight: 82.4, streak: 6, pause: null, habTab: 'habitos', confirmReset: false,
  loads: { puxada: 50, supino: 40, remada: 45, elev: 8, triceps: 25, rosca: 15 },
  sets: { puxada: 2, supino: 0, remada: 0, elev: 0, triceps: 0, rosca: 0 },
  range: 7, toast: null, push: { treino: true, agua: true, refeicao: true, fechamento: true },
  chat: [{ me: false, t: 'Bom dia. Seis dias seguidos, hein? Não se acostuma.' }],
};
const ICON = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  habits: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L6.8 5M3.5 12l1.2 1.2L6.8 11M3.5 18l1.2 1.2L6.8 17"/>',
  gym: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="m8 15 4-5 3 3 5-7"/>',
  chat: '<path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', send: '<path d="M4 12 20 4l-5 16-3-7z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const fmt = n => n.toLocaleString('pt-BR');
const kg = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const done = () => HABITS.filter(h => S.habits[h.key]).length;
const NAV = [['hoje', 'Hoje', 'home'], ['habitos', 'Hábitos', 'habits'], ['treino', 'Treino', 'gym'], ['progresso', 'Progresso', 'chart'], ['mika', 'Mika', 'chat']];
const FRAMES = [
  { id: 'hoje', title: 'Hoje', cmds: '/menu · /agua · /streak', fn: () => scrHoje() },
  { id: 'habitos', title: 'Hábitos e cardápio', cmds: '/menu · /cardapio · /reset', fn: () => scrHabitos() },
  { id: 'treino', title: 'Ficha de treino', cmds: '/ficha · Treinei · Ajustar carga', fn: () => scrTreino() },
  { id: 'progresso', title: 'Progresso e medidas', cmds: '/semana · /relatorio · /peso', fn: () => scrProgresso() },
  { id: 'mika', title: 'Mika', cmds: '/motivar · /meme · /gif · /cantada', fn: () => scrMika() },
  { id: 'ajustes', title: 'Ajustes', cmds: '/pausar · /voltar · lembretes', fn: () => scrAjustes() },
];
let timer;
function toast(frame, text, act) { S.toast = { frame, text, act }; clearTimeout(timer); timer = setTimeout(() => { S.toast = null; render(); }, 4500); }
function frameHtml(f) {
  const t = S.toast && S.toast.frame === f.id ? S.toast : null;
  const nav = NAV.map(([id, label, ic]) => `<button data-act="goto" data-arg="${id}" class="${id === f.id ? 'on' : ''}"${id === f.id ? ' aria-current="page"' : ''}>${ico(ic)}${label}</button>`).join('');
  return `<div class="cap"><b>${f.title}</b><small>${f.cmds}</small></div>
    <div class="phone"><div class="statusbar"><span>13:40</span><span>● sincronizado</span></div>
    <div class="scr" data-scr="${f.id}">${f.fn()}</div>
    ${t ? `<div class="toast" role="status"><span>${t.text}</span>${t.act ? `<button data-act="${t.act.act}" data-arg="${t.act.arg || ''}">${t.act.label}</button>` : ''}</div>` : ''}
    <nav class="nav" aria-label="Navegação">${nav}</nav></div>`;
}
function render() {
  FRAMES.forEach(f => {
    const el = document.getElementById('f-' + f.id), sc = el.querySelector('.scr'), top = sc ? sc.scrollTop : 0;
    el.innerHTML = frameHtml(f);
    el.querySelector('.scr').scrollTop = top;
  });
}
