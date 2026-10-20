const HABITS = [
  ['treino', '💪', 'Treino', 'fitness'], ['cardio', '🏃', 'Cárdio', 'fitness'], ['alongamento', '🧘', 'Alongamento', 'fitness'],
  ['leitura', '📖', 'Leitura', 'wellness'], ['meditacao', '🧘‍♀️', 'Meditação', 'wellness'], ['fio_dental', '🦷', 'Fio dental', 'wellness'],
  ['suplemento', '💊', 'Suplemento', 'nutrition'], ['cafe', '🍳', 'Café da manhã', 'nutrition'], ['almoco', '🍽️', 'Almoço', 'nutrition'],
  ['cafe_tarde', '🍪', 'Café da tarde', 'nutrition'], ['jantar', '🌙', 'Jantar', 'nutrition'], ['sem_acucar', '🚫', 'Sem açúcar', 'nutrition'],
].map(([key, emoji, label, cat]) => ({ key, emoji, label, cat }));
const CATS = { fitness: 'Fitness', nutrition: 'Nutrição', wellness: 'Bem-estar' };
const WATER_GOAL = 3000;
const PACE = 1440; // meta proporcional às 13:40 (feature water-pace do bot)
const FICHA = {
  titulo: 'Superior Metabólico', foco: 'Puxar e empurrar em bi-set, densidade alta e carga moderada',
  metodo: 'Bi-set · 40 s de descanso ao fim do par',
  itens: [
    { key: 'puxada', nome: 'Puxada frontal', aparelho: 'Polia alta', series: 4, reps: '12' },
    { key: 'supino', nome: 'Supino reto com barra', aparelho: 'Banco + barra', series: 4, reps: '12' },
    { key: 'remada', nome: 'Remada sentada', aparelho: 'Polia baixa', series: 3, reps: '15' },
    { key: 'elev', nome: 'Elevação lateral', aparelho: 'Halteres', series: 3, reps: '15' },
    { key: 'triceps', nome: 'Tríceps na corda', aparelho: 'Polia', series: 3, reps: '15' },
    { key: 'rosca', nome: 'Rosca direta', aparelho: 'Barra W', series: 3, reps: '15' },
  ],
  cardio: { nome: 'Bicicleta · Z2', detalhe: '25 min em ritmo constante, depois da musculação' },
};
const DIET = [
  ['cafe', 'Café da manhã', '🥪', '2 fatias de pão integral + 2 colheres de queijo cottage sem lactose + 8 morangos grandes + café preto'],
  ['almoco', 'Almoço', '🍗', 'Peito de frango grelhado (170 g) + 3 fatias de batata doce (120 g) + 1 concha de feijão carioca + brócolis + salada + azeite (5 g)'],
  ['cafe_tarde', 'Café da tarde', '🥛', 'Iogurte natural sem lactose (200 g) + 1 colher de granola sem açúcar + 2 colheres de geleia diet'],
  ['jantar', 'Jantar', '🌯', 'Wrap proteico: 1 tortilha Rap10 + atum em água (100 g) + queijo cottage (30 g) + alface e tomate'],
];
const REPLIES = [
  'Anotado. Agora some do chat e vai fazer, o buchinho não encolhe com mensagem.',
  'Que bonitinho, tentando negociar com a balança. Continua.',
  'Eu até torceria por você, mas estou ocupada contando seus lanches.',
];
function seeded(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
function buildSeries() {
  const rnd = seeded(7), end = new Date('2026-10-20T12:00:00-03:00'), out = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end); d.setDate(d.getDate() - i);
    const dow = d.getDay(), t = 29 - i;
    out.push({ d, day: d.getDate(), weight: +(85.2 - t * 0.095 + (rnd() - 0.5) * 0.7).toFixed(1),
      water: Math.round((1700 + rnd() * 1700) / 50) * 50, trained: dow !== 0 && rnd() > 0.22 });
  }
  out[29].weight = 82.4; out[29].trained = false; out[29].water = 0;
  return out;
}
const SERIES = buildSeries();
const MAPA = [
  ['/menu · /start · /progresso', 'Hoje (anel de hábitos, água, treino) e Hábitos'],
  ['/agua · "bebi 500ml"', 'Cartão de água com +200/+300/+500 e campo de texto rápido, com desfazer'],
  ['/peso /altura /passos /gordura /musculo', 'Progresso › Registrar medidas, com validação de valor ambíguo'],
  ['/ficha · Treinei · Fiz o cárdio · Ajustar carga', 'Aba Treino: séries marcáveis, carga ±2,5/±5 kg salva por exercício'],
  ['/checktreino /cardio /streak /reset', 'Hoje, Treino e Hábitos (zerar o dia pede confirmação)'],
  ['/cardapio', 'Hábitos › Cardápio, cada refeição marca o hábito correspondente'],
  ['/relatorio · /semana', 'Progresso: 7 e 30 dias, gráficos e análise da Mika'],
  ['/pausar · /voltar', 'Ajustes › Pausa (1 a 30 dias), congela sequência e lembretes'],
  ['/motivar /cantada /meme /gif /sticker /instante', 'Aba Mika: chat com atalhos, áudio, meme, GIF e sticker'],
  ['Lembretes 06:00, água, refeição, 21:30', 'Notificações push (Web Push) configuráveis em Ajustes'],
];
