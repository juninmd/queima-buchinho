export interface MealPlan {
  cafe: string;
  almoco: string;
  cafe_tarde: string;
  jantar: string;
}

export const DIET_PLAN: Record<string, MealPlan> = {
  'segunda-feira': {
    cafe: '🍳 2 Ovos mexidos + 1 fatia de pão integral + Café sem açúcar',
    almoco: '🍗 Frango grelhado + 3 colheres de arroz integral + Feijão + Salada verde',
    cafe_tarde: '🥜 Mix de castanhas + 1 fruta + Café ou Chá',
    jantar: '🥣 Sopa de legumes com frango desfiado ou Omelete'
  },
  'terça-feira': {
    cafe: '🥣 Iogurte natural + 2 colheres de aveia + 1 Banana',
    almoco: '🥩 Patinho moído + Batata doce cozida + Brócolis no vapor',
    cafe_tarde: '🥪 Wrap integral com frango desfiado + Cenoura ralada',
    jantar: '🥗 Salada completa com Atum ou Frango + Azeite'
  },
  'quarta-feira': {
    cafe: '🥪 Sanduíche integral com queijo branco e peito de peru + Suco natural',
    almoco: '🐟 Peixe grelhado + Purê de mandioquinha + Aspargos ou Vagem',
    cafe_tarde: '🥑 1 fatia de pão integral + Pasta de abacate + Tomate cereja',
    jantar: '🍳 Crepioca (1 ovo + 2 col. goma de tapioca) com recheio leve'
  },
  'quinta-feira': {
    cafe: '🥚 2 Ovos cozidos + Meio abacate com limão + Café',
    almoco: '🍗 Sobrecoxa assada (sem pele) + Arroz de couve-flor + Feijão',
    cafe_tarde: '🥛 Iogurte proteico + 1 col. pasta de amendoim + 1 banana',
    jantar: '🥣 Caldo de abóbora com carne seca desfiada'
  },
  'sexta-feira': {
    cafe: '🥞 Panqueca de banana (1 banana + 1 ovo + 1 col. aveia)',
    almoco: '🥩 Bife acebolado + Arroz integral + Salada de tomate e pepino',
    cafe_tarde: '🥨 2 torradas integrais + Queijo cottage + Chá verde',
    jantar: '🍕 "Pizza" de Rap10 integral (molho tomate, queijo, orégano)'
  },
  'sábado': {
    cafe: '🍳 Ovos mexidos com bacon (pouco!) + 1 fatia de pão de forma',
    almoco: '🥘 Feijoada LEVE (apenas carnes magras) + Couve + Laranja',
    cafe_tarde: '🥤 Vitamina de frutas + 1 col. aveia + Granola',
    jantar: '🍔 Hambúrguer caseiro (sem pão ou pão integral) + Salada'
  },
  'domingo': {
    cafe: '🥐 Café da manhã especial (com moderação!)',
    almoco: '🍝 Macarrão integral à bolonhesa + Salada de folhas',
    cafe_tarde: '🍿 Pipoca (sem manteiga) + 1 fruta + Chá',
    jantar: '🥪 Sanduíche natural de frango com maionese light'
  }
};
