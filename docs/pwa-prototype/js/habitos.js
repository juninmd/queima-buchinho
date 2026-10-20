function scrHabitos() {
  const n = done(), cat = c => HABITS.filter(h => h.cat === c).map(h => `
    <button class="row ${S.habits[h.key] ? 'done' : ''}" data-act="habit" data-arg="${h.key}" aria-pressed="${!!S.habits[h.key]}">
      <span class="em">${h.emoji}</span><span class="grow">${h.label}</span><span class="tick">${ico('check')}</span></button>`).join('');
  const habits = Object.keys(CATS).map(c => `<section style="display:grid;gap:8px"><p class="eyebrow">${CATS[c]}</p>${cat(c)}</section>`).join('') + `
    <button class="btn ${S.confirmReset ? 'danger' : ''}" data-act="reset">${S.confirmReset ? 'Toque de novo para zerar o dia' : 'Zerar o dia'}</button>`;
  const meals = DIET.map(([k, nome, em, txt]) => `
    <article class="card meal ${S.habits[k] ? 'done' : ''}"><h2>${em} ${nome}<span class="chip ${S.habits[k] ? 'good' : ''}">${S.habits[k] ? 'feita' : 'pendente'}</span></h2>
      <p>${txt}</p><button class="btn ${S.habits[k] ? 'on' : ''}" data-act="habit" data-arg="${k}">${S.habits[k] ? 'Feita' : 'Marcar como feita'}</button></article>`).join('');
  return `
  <header class="top"><div><p class="eyebrow">${n} de ${HABITS.length} hoje</p><h1>Hábitos</h1></div><span class="chip ${n >= 8 ? 'good' : 'warn'} num">${Math.round((n / HABITS.length) * 100)}%</span></header>
  <div class="seg" role="tablist">${[['habitos', 'Hábitos'], ['cardapio', 'Cardápio']].map(([k, l]) => `<button role="tab" class="${S.habTab === k ? 'on' : ''}" data-act="tab" data-arg="${k}">${l}</button>`).join('')}</div>
  ${S.habTab === 'habitos' ? habits : `<p class="sub">Terça-feira · plano de queima de gordura</p>${meals}`}`;
}
