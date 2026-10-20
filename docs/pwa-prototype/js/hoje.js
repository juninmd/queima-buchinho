function scrHoje() {
  const n = done(), C = 2 * Math.PI * 38, off = C * (1 - n / HABITS.length);
  const wp = Math.min(100, (S.water / WATER_GOAL) * 100), behind = S.water < PACE;
  const doneT = S.habits.treino;
  const line = n < 6 ? `Já passou do meio-dia e são só ${n} hábitos. O buchinho agradece a calma.`
    : `${n} hábitos marcados. Estou desconfiada, mas vou fingir que acredito.`;
  const next = DIET.find(([k]) => !S.habits[k]);
  return `
  <header class="top"><div><p class="eyebrow">Terça · 20 de outubro</p><h1>Hoje</h1></div>
    <button class="icon-btn" data-act="goto" data-arg="ajustes" aria-label="Abrir ajustes">${ico('gear')}</button></header>
  ${S.pause ? `<div class="card pause"><b>Pausa ativa por ${S.pause} dia${S.pause > 1 ? 's' : ''}</b><p class="sub">Sem lembretes. Sequência congelada.</p></div>` : ''}
  <article class="mika"><span class="avatar" aria-hidden="true">M</span><p>${line}</p></article>
  <section class="card hero" aria-label="Resumo do dia">
    <div class="ring"><svg viewBox="0 0 92 92" aria-hidden="true"><circle class="tr" cx="46" cy="46" r="38"/><circle class="fg" cx="46" cy="46" r="38" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg><b>${n}/${HABITS.length}</b></div>
    <div class="stats">
      <div class="stat"><b>${S.streak} dias</b><span>sequência de treino</span></div>
      <div class="stat"><b>${kg(S.weight)} kg</b><span>${kg(S.weight - 85.2)} kg desde o início</span></div>
    </div>
  </section>
  <section class="card" aria-label="Água">
    <h2>Água <small>meta ${fmt(WATER_GOAL)} ml</small></h2>
    <div class="big">${fmt(S.water)} <small>ml</small></div>
    <div class="bar ${S.water >= WATER_GOAL ? 'good' : ''}"><i style="width:${wp}%"></i><u style="left:${(PACE / WATER_GOAL) * 100}%" title="Ritmo do dia"></u></div>
    <p class="sub">${behind ? `Abaixo do ritmo das 13:40 (${fmt(PACE)} ml). Beba um copo.` : 'No ritmo ou à frente. Raro.'}</p>
    <div class="btns">${[200, 300, 500].map(v => `<button class="btn" data-act="water" data-arg="${v}">+${v}</button>`).join('')}</div>
  </section>
  <form class="ql" data-form="ql"><label class="sr" for="ql" hidden>Registro rápido</label><input id="ql" name="ql" placeholder="bebi 500ml · pesei 82,5 · treinei" autocomplete="off"><button class="btn primary" aria-label="Enviar">${ico('send')}</button></form>
  <section class="card">
    <h2>Treino de hoje <small>${FICHA.itens.length} exercícios + cárdio</small></h2>
    <div class="row ${doneT ? 'done' : ''}" style="cursor:default"><span class="em">💪</span><span class="grow">${FICHA.titulo}<br><small class="sub">${FICHA.cardio.nome} · 25 min</small></span><span class="tick">${ico('check')}</span></div>
    <button class="btn primary" data-act="goto" data-arg="treino">${doneT ? 'Ver ficha' : 'Abrir ficha'}</button>
  </section>
  ${next ? `<section class="card meal"><h2>Próxima refeição <small>${next[1]}</small></h2><p>${next[3]}</p>
    <button class="btn" data-act="habit" data-arg="${next[0]}">Marcar como feita</button></section>` : ''}`;
}
