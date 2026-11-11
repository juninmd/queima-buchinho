import type { DayPlan, PlanItem } from './types';

/** Atalho para manter uma prescrição por linha. */
const it = (key: string, series: number, reps: string, descansoS: number): PlanItem =>
  ({ key, series, reps, descansoS });

// Protocolo de queima de gordura com divisão Inferior / Superior / Metabólico:
// - Cada músculo grande recebe 2 estímulos por semana (o ideal para preservar massa magra
//   em déficit calórico), com 48-72 h entre os dias pesados do mesmo grupo.
// - Seg/Sex (inferior) e Ter/Qui (superior) são os dias de carga: multiarticular primeiro,
//   8-12 reps, 60 s de descanso. Qua/Sáb são circuitos metabólicos de carga moderada.
// - Puxar >= empurrar no volume semanal (postura e ombro saudável), deltoide posterior incluso.
// - Cárdio SEMPRE depois da musculação; esteira e bicicleta alternam para poupar articulações.
export const FAT_BURN_PLANS: DayPlan[] = [
  {
    key: 'lower_a',
    emoji: '🦵',
    titulo: 'Inferior A — Quadríceps',
    foco: 'Agachamento pesado puxando o dia: maior massa muscular = maior queima pós-treino',
    metodo: 'Séries tradicionais: termine todas as séries de um exercício antes do próximo',
    itens: [
      it('agacho_barra', 4, '10-12', 60),
      it('leg_press', 3, '12-15', 60),
      it('afundo_bulgaro', 3, '10 cada perna', 60),
      it('cadeira_extensora', 3, '15', 45),
      it('panturrilha_sentado', 4, '15-20', 30),
      it('abdominal_polia', 3, '15', 45),
    ],
    cardio: it('bike_liss', 1, '25 min', 0),
  },
  {
    key: 'upper_a',
    emoji: '💪',
    titulo: 'Superior A — Empurrar e Puxar Horizontal',
    foco: 'Peito e costas em bi-set antagonista: densidade alta sem perder carga',
    metodo: 'Bi-set (exercícios 1+2, 3+4, 5+6), descanso só ao fim de cada par',
    itens: [
      it('supino_barra', 4, '10-12', 60),
      it('remada_curvada', 4, '10-12', 60),
      it('supino_incl_halter', 3, '12', 45),
      it('remada_unilateral', 3, '12 cada lado', 45),
      it('elev_lateral', 3, '15', 30),
      it('triceps_corda', 3, '15', 30),
    ],
    cardio: it('esteira_hiit', 1, '15 min', 0),
  },
  {
    key: 'metcon_a',
    emoji: '🔥',
    titulo: 'Metabólico A — Potência + Core',
    foco: 'Explosão de quadril e perna em circuito — pico de frequência cardíaca',
    metodo: 'Circuito: 3-4 voltas, descanso só ao fim de cada volta',
    itens: [
      it('box_jump', 3, '8', 60),
      it('kb_swing', 4, '20', 45),
      it('agacho_sumo', 3, '15', 45),
      it('kb_thruster', 3, '12', 45),
      it('mountain_climber', 3, '30 s', 30),
      it('russian_twist', 3, '20', 30),
    ],
    cardio: it('esteira_interv', 1, '20 min', 0),
  },
  {
    key: 'upper_b',
    emoji: '⚡',
    titulo: 'Superior B — Vertical + Ombro',
    foco: 'Costas largas e ombro completo (anterior, lateral e posterior)',
    metodo: 'Bi-set (exercícios 1+2, 3+4, 5+6), descanso só ao fim de cada par',
    itens: [
      it('puxada_frontal', 4, '10-12', 60),
      it('desenv_halter', 4, '10-12', 60),
      it('chin_up', 3, 'até a falha', 60),
      it('crossover', 3, '15', 45),
      it('crucifixo_inverso', 3, '15', 30),
      it('rosca_direta', 3, '12', 30),
    ],
    cardio: it('bike_hiit', 1, '15 min', 0),
  },
  {
    key: 'lower_b',
    emoji: '🍑',
    titulo: 'Inferior B — Posterior + Glúteo',
    foco: 'Cadeia posterior inteira: glúteo, posterior de coxa e lombar',
    metodo: 'Séries tradicionais: termine todas as séries de um exercício antes do próximo',
    itens: [
      it('stiff_barra', 4, '10-12', 60),
      it('elevacao_pelvica', 4, '12', 60),
      it('afundo_halter', 3, '12 cada perna', 45),
      it('mesa_flexora', 3, '12-15', 45),
      it('hiperextensao', 3, '15', 45),
      it('panturrilha_sentado', 4, '15-20', 30),
    ],
    cardio: it('esteira_incl', 1, '30 min', 0),
  },
  {
    key: 'metcon_b',
    emoji: '🧨',
    titulo: 'Metabólico B — Superior + Core',
    foco: 'Circuito de tronco e pegada, poupando a perna do dia anterior',
    metodo: 'Circuito: 3 voltas, descanso só ao fim de cada volta',
    itens: [
      it('flexao', 3, 'até a falha', 45),
      it('remada_sentada', 3, '15', 45),
      it('face_pull', 3, '15', 30),
      it('rosca_martelo', 3, '12', 30),
      it('farmer_walk', 3, '40 m', 60),
      it('prancha', 3, '45 s', 30),
    ],
    cardio: it('esteira_liss', 1, '35 min', 0),
  },
];

/** Segunda a sábado. Domingo é descanso e não entra na rotação (o cron nem dispara). */
export const WEEKDAY_PLAN: Record<string, string> = {
  'segunda-feira': 'lower_a',
  'terça-feira': 'upper_a',
  'quarta-feira': 'metcon_a',
  'quinta-feira': 'upper_b',
  'sexta-feira': 'lower_b',
  'sábado': 'metcon_b',
};

export const PLAN_MAP = new Map(FAT_BURN_PLANS.map(p => [p.key, p]));
