function scrTreino() {
  const total = FICHA.itens.reduce((a, i) => a + i.series, 0), feitas = FICHA.itens.reduce((a, i) => a + S.sets[i.key], 0);
  const ex = FICHA.itens.map(i => `
    <article class="card ex"><div class="tile" title="Foto do aparelho">${ico('gym')}</div>
      <div><h3>${i.nome}</h3><p class="sub">${i.aparelho} · ${i.series} × ${i.reps} · 40 s</p>
        <div class="dots">${Array.from({ length: i.series }, (_, k) => `<button class="${k < S.sets[i.key] ? 'on' : ''}" data-act="set" data-arg="${i.key}|${k}" aria-label="Série ${k + 1}">${ico('check')}</button>`).join('')}</div></div>
      <div class="stepper">${[-5, -2.5].map(d => `<button class="btn sm" data-act="load" data-arg="${i.key}|${d}">${kg(d)}</button>`).join('')}
        <b>${kg(S.loads[i.key])} kg</b>${[2.5, 5].map(d => `<button class="btn sm" data-act="load" data-arg="${i.key}|${d}">+${kg(d)}</button>`).join('')}</div></article>`).join('');
  return `
  <header class="top"><div><p class="eyebrow">Terça · ficha das 06:00</p><h1>${FICHA.titulo}</h1></div><span class="chip num">${feitas}/${total}</span></header>
  <p class="sub">${FICHA.foco}</p>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${FICHA.metodo}</span><span class="chip">cárdio depois</span></div>
  ${ex}
  <article class="card"><h2>🚴 ${FICHA.cardio.nome}<span class="chip ${S.habits.cardio ? 'good' : ''}">${S.habits.cardio ? 'feito' : 'pendente'}</span></h2><p class="sub">${FICHA.cardio.detalhe}</p></article>
  <div class="btns">
    <button class="btn ${S.habits.treino ? 'on' : 'primary'}" data-act="finish" data-arg="treino">${S.habits.treino ? 'Treinei ✓' : 'Treinei'}</button>
    <button class="btn ${S.habits.cardio ? 'on' : ''}" data-act="finish" data-arg="cardio">${S.habits.cardio ? 'Cárdio ✓' : 'Fiz o cárdio'}</button>
  </div>`;
}
