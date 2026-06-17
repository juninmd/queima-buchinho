export interface MealPlan {
  cafe: string;
  almoco: string;
  cafe_tarde: string;
  jantar: string;
}

export const DIET_PLAN: Record<string, MealPlan> = {
  'segunda-feira': {
    cafe: '🍳 1 Pão francês (50g) + 1 Ovo mexido + 1 fatia de Queijo muçarela sem lactose + Mamão (100g) + Chá/Café',
    almoco: '🐟 Filé de peixe grelhado (140g) + 2 colheres de Arroz branco (90g) + 1 concha de Feijão preto (140g) + Couve-flor (192g) + Salada à vontade + 1 colher de sobremesa de Azeite (5g)',
    cafe_tarde: '🥪 2 fatias de Pão integral + Peito de frango desfiado (30g) + Café c/ 1 colher de chá de açúcar',
    jantar: '🥩 Carne magra grelhada (110g) + 2 colheres de Arroz branco (90g) + 1 concha rasa de Feijão carioca (80g) + Berinjela grelhada (75g) + Salada à vontade + 1 colher de sobremesa de Azeite (5g)'
  },
  'terça-feira': {
    cafe: '🥪 2 fatias de Pão integral + 2 colheres de sopa de Queijo cottage sem lactose + 8 Morangos grandes + Café preto',
    almoco: '🍗 Peito de frango grelhado (170g) + 3 fatias de Batata doce cozida (120g) + 1 concha de Feijão carioca (140g) + Brócolis refogado + Salada + 1 colher de sobremesa de Azeite (5g)',
    cafe_tarde: '🥛 Iogurte natural sem lactose (200g) + 1 colher de sopa de Granola sem açúcar (13g) + 2 colheres de Geleia diet linea (40g)',
    jantar: '🌯 Wrap Proteico: 1 Tortilha integral Rap10 + Atum em água (100g) + 1 colher de sopa de Queijo cottage (30g) + Alface e Tomate'
  },
  'quarta-feira': {
    cafe: '🥞 Panqueca de Aveia: 2 colheres de aveia (30g) + 1 Ovo + 1 colher de requeijão zero lactose + 1 Maçã + Chá',
    almoco: '🥩 Carne magra (135g) + Macarrão integral (100g) + Lentilha (52g) + Abobrinha cozida (180g) + Salada + Azeite (5g)',
    cafe_tarde: '🍳 Wrap 10 com ovo: 1 Rap10 (35g) + 1 ovo mexido + alface e tomate',
    jantar: '🥗 Salada Caesar Proteica: 100g de frango grelhado + alface romana + 10g de parmesão zero lactose + Molho Caesar sem lactose + Azeite (5ml)'
  },
  'quinta-feira': {
    cafe: '🥞 Crepioca: 3 colheres de goma de tapioca (45g) + 1 Ovo + 1 fatia de Queijo muçarela sem lactose + Mamão (100g) + Café',
    almoco: '🐟 Filé de salmão (120g) + Mandioca cozida (100g) + Grão de bico (60g) + Repolho branco cozido + Salada + Azeite (5g)',
    cafe_tarde: '🥪 2 fatias de Pão integral + Atum em água (100g) + 1 colher de Maionese light + Alface',
    jantar: '🥣 Sopa Cremosa: Peito de frango desfiado (80g) + 100g de batata-doce + cenoura + espinafre + 1 colher de chá de azeite'
  },
  'sexta-feira': {
    cafe: '🍳 Ovos mexidos (2 un) + 1 fatia de Pão de forma integral + Mamão (100g) + Chá',
    almoco: '🥩 Carne magra (135g) + Purê de batata baroa (114g) + Feijão preto + Couve refogada + Salada + Azeite (5g)',
    cafe_tarde: '🥛 Iogurte natural sem lactose (200g) + 1 colher de sopa de Granola sem açúcar (13g) + 2 colheres de Geleia diet linea (40g)',
    jantar: '🥪 Sanduíche de Carne: 1 Pão francês + 80g de carne magra grelhada + 1 fatia de Queijo minas frescal zero lactose + Rúcula + Mostarda'
  },
  'sábado': {
    cafe: '🌽 Cuscuz Nordestino: 1 pedaço médio (135g) + 1 Ovo mexido + 1 fatia de Queijo muçarela sem lactose + Café',
    almoco: '🍗 Frango desfiado (150g) + Arroz integral cozido (110g) + Feijão preto + Brócolis + Salada + Azeite (5g)',
    cafe_tarde: '🥞 Panquecas de aveia com mel: 2 colheres de aveia + 1 ovo + 1 colher de chá de mel',
    jantar: '🌯 Wrap de Frango com Abacate: 1 Rap10 (50g) + 80g de frango + 1 colher de sopa de abacate (30g) + Alface e Cenoura'
  },
  'domingo': {
    cafe: '🥚 2 Ovos cozidos + 2 torradas integrais + 100g de Mamão + Café',
    almoco: '🥩 Bife de alcatra grelhado (135g) + 2 colheres de Arroz + Feijão carioca + Brócolis/Couve-flor + Salada + Azeite (5g)',
    cafe_tarde: '🥪 2 fatias de pão integral + 30g de queijo cottage sem lactose + Café',
    jantar: '🌮 Tapioca com Frango: 3 colheres de tapioca (90g) + 80g de frango desfiado + 1 colher de requeijão light + Alface e Cenoura'
  }
};
