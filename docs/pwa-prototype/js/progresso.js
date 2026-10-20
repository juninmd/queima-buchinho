function lineChart(pts, w = 300, h = 120) {
  const vs = pts.map(p => p.weight), lo = Math.min(...vs) - 0.3, hi = Math.max(...vs) + 0.3, X = i => 28 + (i / (pts.length - 1)) * (w - 40), Y = v => 10 + (1 - (v - lo) / (hi - lo)) * (h - 32);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.weight).toFixed(1)}`).join(' ');
  const last = pts.length - 1;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Peso de ${kg(vs[0])} a ${kg(vs[last])} kg">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
    <line class="grid" x1="28" x2="${w - 12}" y1="${Y(hi - 0.3)}" y2="${Y(hi - 0.3)}"/><line class="grid" x1="28" x2="${w - 12}" y1="${Y(lo + 0.3)}" y2="${Y(lo + 0.3)}"/>
    <text x="0" y="${Y(hi - 0.3) + 3}">${kg(hi - 0.3)}</text><text x="0" y="${Y(lo + 0.3) + 3}">${kg(lo + 0.3)}</text>
    <path d="${d} L${X(last)} ${h - 22} L${X(0)} ${h - 22}Z" fill="url(#wg)"/><path d="${d}" fill="none" style="stroke:var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${X(last)}" cy="${Y(vs[last])}" r="4" style="fill:var(--accent)"/>
    <text x="28" y="${h - 6}">${pts[0].day}/10</text><text x="${w - 12}" y="${h - 6}" text-anchor="end">hoje</text></svg>`;
}
function barChart(pts, w = 300, h = 120) {
  const max = 3600, bw = (w - 40) / pts.length, Y = v => 8 + (1 - v / max) * (h - 30);
  const bars = pts.map((p, i) => `<rect x="${30 + i * bw + bw * 0.15}" y="${Y(p.water)}" width="${bw * 0.7}" height="${h - 22 - Y(p.water)}" rx="2" style="fill:var(${p.water >= WATER_GOAL ? '--accent' : '--water'})"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Água por dia, meta ${fmt(WATER_GOAL)} ml">
    <line class="grid" x1="28" x2="${w - 8}" y1="${h - 22}" y2="${h - 22}"/><line class="goal" x1="28" x2="${w - 8}" y1="${Y(WATER_GOAL)}" y2="${Y(WATER_GOAL)}"/>
    <text x="0" y="${Y(WATER_GOAL) + 3}">3000</text><text x="0" y="${h - 19}">0</text>${bars}
    <text x="28" y="${h - 6}">${pts[0].day}/10</text><text x="${w - 8}" y="${h - 6}" text-anchor="end">hoje</text></svg>`;
}
function scrProgresso() {
  const r = SERIES.slice(-S.range).map((p, i, a) => (i === a.length - 1 ? { ...p, water: S.water, trained: !!S.habits.treino, weight: S.weight } : p));
  const trained = r.filter(p => p.trained).length, avg = Math.round(r.slice(0, -1).reduce((a, p) => a + p.water, 0) / (r.length - 1) / 50) * 50;
  const lead = new Date('2026-09-21T12:00:00-03:00').getDay(), cells = SERIES.map((p, i) => `<i class="${(i === 29 ? S.habits.treino : p.trained) ? 'y' : ''} ${i === 29 ? 't' : ''}">${p.day}</i>`).join('');
  const field = (id, l, ph) => `<label class="field" for="${id}">${l}<input id="${id}" inputmode="decimal" placeholder="${ph}"></label>`;
  return `
  <header class="top"><div><p class="eyebrow">Relatório com a Mika</p><h1>Progresso</h1></div></header>
  <div class="seg">${[7, 30].map(v => `<button class="${S.range === v ? 'on' : ''}" data-act="range" data-arg="${v}">${v} dias</button>`).join('')}</div>
  <div class="stats"><div class="card stat"><b>${trained}/${r.length}</b><span>treinos</span></div><div class="card stat"><b>${fmt(avg)} ml</b><span>água média</span></div>
    <div class="card stat"><b>${kg(r[0].weight - S.weight)} kg</b><span>perdidos no período</span></div><div class="card stat"><b>${S.streak} dias</b><span>sequência</span></div></div>
  <section class="card"><h2>Peso <small>kg</small></h2>${lineChart(r)}</section>
  <section class="card"><h2>Água <small>meta ${fmt(WATER_GOAL)} ml</small></h2>${barChart(r)}</section>
  <section class="card"><h2>Calendário de treinos <small>30 dias</small></h2><div class="cal">${Array(lead).fill('<i style="background:none"></i>').join('')}${cells}</div></section>
  <article class="mika"><span class="avatar">M</span><p>Perdeu ${kg(85.2 - S.weight)} kg em 30 dias e treinou ${SERIES.filter(p => p.trained).length} vezes. Continua assim e eu paro de te chamar de buchinho. Quase.</p></article>
  <section class="card"><h2>Registrar medidas</h2>
    <div class="stats">${field('m1', 'Peso (kg)', '82,4')}${field('m2', 'Passos', '8.000')}${field('m3', 'Gordura (%)', '14,5')}${field('m4', 'Músculo (%)', '42,1')}</div>
    <button class="btn primary" data-act="save">Salvar medidas</button></section>`;
}
