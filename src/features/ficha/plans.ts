import type { DayPlan, PlanItem } from './types';

/** Atalho para manter uma prescrição por linha. */
const it = (key: string, series: number, reps: string, descansoS: number): PlanItem =>
  ({ key, series, reps, descansoS });

// Protocolo de queima de gordura (treino metabólico): multiarticular primeiro, repetição
// alta, descanso curto (40-60 s) para segurar a frequência cardíaca na zona de gasto, e
// cárdio SEMPRE depois da musculação — glicogênio já drenado, oxidação de gordura maior.
// Esteira e bicicleta alternam ao longo da semana para não sobrecarregar joelho e tornozelo.
export const FAT_BURN_PLANS: DayPlan[] = [
  {
    key: 'full_a',
    emoji: '🔥',
    titulo: 'Full Body Metabólico A',
    foco: 'Corpo inteiro em circuito — maior gasto calórico por minuto',
    metodo: 'Circuito: 3 voltas, 45 s de descanso só no fim de cada volta',
    itens: [
      it('agacho_barra', 3, '12-15', 45),
      it('supino_incl_halter', 3, '12', 45),
      it('remada_curvada', 3, '12', 45),
      it('desenv_halter', 3, '12', 45),
      it('kb_swing', 3, '20', 45),
      it('prancha', 3, '45 s', 45),
    ],
    cardio: it('esteira_hiit', 1, '15 min', 0),
  },
  {
    key: 'upper_a',
    emoji: '💪',
    titulo: 'Superior Metabólico',
    foco: 'Puxar e empurrar em bi-set — densidade alta, carga moderada',
    metodo: 'Bi-set (dois exercícios seguidos), 40 s de descanso ao fim do par',
    itens: [
      it('puxada_frontal', 4, '12', 40),
      it('supino_barra', 4, '12', 40),
      it('remada_sentada', 3, '15', 40),
      it('elev_lateral', 3, '15', 40),
      it('triceps_corda', 3, '15', 40),
      it('rosca_direta', 3, '15', 40),
    ],
    cardio: it('bike_liss', 1, '25 min', 0),
  },
  {
    key: 'lower_a',
    emoji: '🦵',
    titulo: 'Inferior + Glúteo',
    foco: 'Maior massa muscular do corpo = maior queima no pós-treino',
    metodo: 'Circuito: 3 voltas, 45 s de descanso no fim de cada volta',
    itens: [
      it('leg_press', 4, '15', 45),
      it('elevacao_pelvica', 4, '12', 45),
      it('afundo_halter', 3, '12 cada perna', 45),
      it('mesa_flexora', 3, '15', 45),
      it('cadeira_extensora', 3, '15', 45),
      it('panturrilha_sentado', 4, '20', 45),
    ],
    cardio: it('esteira_incl', 1, '30 min', 0),
  },
  {
    key: 'full_b',
    emoji: '🧨',
    titulo: 'Full Body Metabólico B',
    foco: 'Movimentos explosivos e carregados — pico de frequência cardíaca',
    metodo: 'Circuito: 3 voltas, 45 s de descanso no fim de cada volta',
    itens: [
      it('agacho_sumo', 3, '15', 45),
      it('remada_alta', 3, '12', 45),
      it('flexao', 3, 'até a falha', 45),
      it('kb_thruster', 3, '12', 45),
      it('farmer_walk', 3, '40 m', 45),
      it('mountain_climber', 3, '30 s', 45),
    ],
    cardio: it('bike_hiit', 1, '15 min', 0),
  },
  {
    key: 'upper_b',
    emoji: '⚡',
    titulo: 'Superior + Core',
    foco: 'Peito, costas e abdômen com descanso curto',
    metodo: 'Bi-set, 40 s de descanso ao fim do par',
    itens: [
      it('supino_incl_halter', 4, '12', 40),
      it('chin_up', 4, 'até a falha', 40),
      it('crossover', 3, '15', 40),
      it('face_pull', 3, '15', 40),
      it('rosca_martelo', 3, '12', 40),
      it('abdominal_polia', 3, '15', 40),
    ],
    cardio: it('esteira_interv', 1, '20 min', 0),
  },
  {
    key: 'lower_b',
    emoji: '🍑',
    titulo: 'Inferior + Cárdio Longo',
    foco: 'Posterior de coxa e glúteo, fechando com o cárdio mais longo da semana',
    metodo: 'Circuito: 3 voltas, 60 s de descanso no fim de cada volta',
    itens: [
      it('stiff_barra', 4, '12', 60),
      it('box_jump', 3, '10', 60),
      it('agacho_barra', 3, '15', 60),
      it('mesa_flexora', 3, '15', 60),
      it('hiperextensao', 3, '15', 60),
      it('russian_twist', 3, '20', 60),
    ],
    cardio: it('esteira_liss', 1, '35 min', 0),
  },
];

/** Segunda a sábado. Domingo é descanso e não entra na rotação (o cron nem dispara). */
export const WEEKDAY_PLAN: Record<string, string> = {
  'segunda-feira': 'full_a',
  'terça-feira': 'upper_a',
  'quarta-feira': 'lower_a',
  'quinta-feira': 'full_b',
  'sexta-feira': 'upper_b',
  'sábado': 'lower_b',
};

export const PLAN_MAP = new Map(FAT_BURN_PLANS.map(p => [p.key, p]));
