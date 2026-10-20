function scrAjustes() {
  const sw = (k, l, d) => `<div class="row" style="cursor:default"><span class="grow">${l}<br><small class="sub">${d}</small></span><button class="sw ${S.push[k] ? 'on' : ''}" role="switch" aria-checked="${S.push[k]}" aria-label="${l}" data-act="push" data-arg="${k}"></button></div>`;
  return `
  <header class="top"><div><p class="eyebrow">Conta e app</p><h1>Ajustes</h1></div></header>
  <section class="card"><h2>Instalar no celular</h2><p class="sub">Abre em tela cheia, funciona sem internet e envia lembretes como o Telegram.</p><button class="btn primary">Adicionar à tela inicial</button></section>
  <section class="card"><h2>Lembretes</h2>
    ${sw('treino', 'Ficha às 06:00', 'Segunda a sábado, com a provocação da Mika')}
    ${sw('agua', 'Água', 'Só quando você está abaixo do ritmo do dia')}
    ${sw('refeicao', 'Refeições', 'Só se ainda não marcou')}
    ${sw('fechamento', 'Fechamento às 21:30', 'Relatório do dia com o dashboard')}</section>
  <section class="card ${S.pause ? 'pause' : ''}"><h2>Pausa <small>${S.pause ? `ativa: ${S.pause} dia${S.pause > 1 ? 's' : ''}` : 'desativada'}</small></h2>
    <p class="sub">Sem lembretes nem cobranças. A sequência de treinos fica congelada.</p>
    <div class="btns">${[1, 3, 7, 30].map(d => `<button class="btn sm ${S.pause === d ? 'on' : ''}" data-act="pause" data-arg="${d}">${d} d</button>`).join('')}</div>
    ${S.pause ? '<button class="btn" data-act="resume">Voltar agora</button>' : ''}</section>
  <section class="card"><h2>Conexão</h2>
    <label class="field" for="api">URL da API<input id="api" value="https://api.buchinho.exemplo/api"></label>
    <label class="field" for="tok">Token<input id="tok" type="password" value="exemplo-de-token"></label>
    <span class="chip good">Conectado · 3 ações aguardando sync quando offline</span></section>`;
}
