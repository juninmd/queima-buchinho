const stage = document.getElementById('stage');
stage.innerHTML = FRAMES.map(f => `<section class="frame-wrap" id="f-${f.id}"></section>`).join('');
document.getElementById('map').innerHTML = `<table><thead><tr><th>No Telegram</th><th>No app</th></tr></thead><tbody>${MAPA.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>`;
render();
