import type { CatalogEntry, Grupo } from './types';

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/** Atalho para uma entrada por linha: key, nome, aparelho, imagem, carga inicial (kg) ou null, grupo principal. */
const ex = (key: string, nome: string, aparelho: string, img: string, cargaPadraoKg: number | null, grupo: Grupo): CatalogEntry =>
  ({ key, nome, aparelho, img: BASE + img, cargaPadraoKg, grupo });

// Imagens: free-exercise-db (dominio publico, servido pelo CDN do GitHub). Todas retornaram
// 200 na geracao deste arquivo; o teste do catalogo trava o formato sem depender de rede.
export const CATALOG: CatalogEntry[] = [
  ex('agacho_barra', 'Agachamento livre com barra', 'Rack de agachamento + barra', 'Barbell_Squat/0.jpg', 30, 'quadriceps'),
  ex('leg_press', 'Leg press 45°', 'Leg press 45°', 'Leg_Press/0.jpg', 80, 'quadriceps'),
  ex('afundo_bulgaro', 'Agachamento búlgaro', 'Banco + halteres', 'Split_Squat_with_Dumbbells/0.jpg', 8, 'quadriceps'),
  ex('afundo_halter', 'Afundo alternado', 'Halteres', 'Dumbbell_Lunges/0.jpg', 10, 'posterior'),
  ex('stiff_barra', 'Levantamento terra romeno (stiff)', 'Barra livre', 'Romanian_Deadlift/0.jpg', 30, 'posterior'),
  ex('cadeira_extensora', 'Cadeira extensora', 'Cadeira extensora', 'Leg_Extensions/0.jpg', 25, 'quadriceps'),
  ex('mesa_flexora', 'Mesa flexora deitada', 'Mesa flexora', 'Lying_Leg_Curls/0.jpg', 25, 'posterior'),
  ex('elevacao_pelvica', 'Elevação pélvica', 'Banco + barra', 'Barbell_Hip_Thrust/0.jpg', 40, 'posterior'),
  ex('panturrilha_sentado', 'Panturrilha sentado', 'Máquina de panturrilha sentado', 'Seated_Calf_Raise/0.jpg', 30, 'panturrilha'),
  ex('agacho_sumo', 'Agachamento sumô', 'Halter', 'Plie_Dumbbell_Squat/0.jpg', 16, 'quadriceps'),
  ex('supino_barra', 'Supino reto', 'Banco reto + barra', 'Barbell_Bench_Press_-_Medium_Grip/0.jpg', 30, 'peito'),
  ex('supino_incl_halter', 'Supino inclinado', 'Banco inclinado + halteres', 'Incline_Dumbbell_Press/0.jpg', 16, 'peito'),
  ex('crossover', 'Crossover na polia alta', 'Cross over', 'Cable_Crossover/0.jpg', 10, 'peito'),
  ex('flexao', 'Flexão de braço', 'Peso do corpo', 'Pushups/0.jpg', null, 'peito'),
  ex('remada_curvada', 'Remada curvada', 'Barra livre', 'Bent_Over_Barbell_Row/0.jpg', 25, 'costas'),
  ex('remada_unilateral', 'Remada unilateral (serrote)', 'Banco + halter', 'One-Arm_Dumbbell_Row/0.jpg', 16, 'costas'),
  ex('puxada_frontal', 'Puxada frontal pegada larga', 'Pulley alto (puxador)', 'Wide-Grip_Lat_Pulldown/0.jpg', 35, 'costas'),
  ex('remada_sentada', 'Remada sentada', 'Pulley baixo (remada)', 'Seated_Cable_Rows/0.jpg', 35, 'costas'),
  ex('chin_up', 'Barra fixa supinada', 'Barra fixa', 'Chin-Up/0.jpg', null, 'costas'),
  ex('desenv_halter', 'Desenvolvimento de ombro', 'Banco + halteres', 'Dumbbell_Shoulder_Press/0.jpg', 12, 'ombro'),
  ex('elev_lateral', 'Elevação lateral', 'Halteres', 'Side_Lateral_Raise/0.jpg', 8, 'ombro'),
  ex('crucifixo_inverso', 'Crucifixo inverso (deltoide posterior)', 'Halteres', 'Reverse_Flyes/0.jpg', 6, 'ombro'),
  ex('face_pull', 'Face pull', 'Polia + corda', 'Face_Pull/0.jpg', 15, 'ombro'),
  ex('triceps_corda', 'Tríceps pulley com corda', 'Polia + corda', 'Triceps_Pushdown_-_Rope_Attachment/0.jpg', 15, 'triceps'),
  ex('rosca_direta', 'Rosca direta', 'Barra W', 'Barbell_Curl/0.jpg', 15, 'biceps'),
  ex('rosca_martelo', 'Rosca martelo alternada', 'Halteres', 'Alternate_Hammer_Curl/0.jpg', 10, 'biceps'),
  ex('kb_swing', 'Swing com kettlebell', 'Kettlebell', 'One-Arm_Kettlebell_Swings/0.jpg', 12, 'posterior'),
  ex('kb_thruster', 'Thruster', 'Kettlebell', 'Kettlebell_Thruster/0.jpg', 10, 'full'),
  ex('farmer_walk', 'Caminhada do fazendeiro (40 m)', 'Halteres pesados', 'Farmers_Walk/0.jpg', 20, 'full'),
  ex('box_jump', 'Salto na caixa', 'Caixa pliométrica', 'Front_Box_Jump/0.jpg', null, 'quadriceps'),
  ex('mountain_climber', 'Escalador', 'Peso do corpo', 'Mountain_Climbers/0.jpg', null, 'core'),
  ex('prancha', 'Prancha isométrica', 'Colchonete', 'Plank/0.jpg', null, 'core'),
  ex('russian_twist', 'Torção russa', 'Anilha', 'Russian_Twist/0.jpg', null, 'core'),
  ex('abdominal_polia', 'Abdominal na polia ajoelhado', 'Polia + corda', 'Cable_Crunch/0.jpg', 20, 'core'),
  ex('hiperextensao', 'Hiperextensão lombar', 'Banco romano', 'Hyperextensions_Back_Extensions/0.jpg', null, 'posterior'),
  ex('esteira_hiit', 'Esteira — HIIT 1:2 (15 min)', 'Esteira ergométrica', 'Running_Treadmill/0.jpg', null, 'cardio'),
  ex('esteira_incl', 'Esteira — caminhada inclinada 12% (30 min)', 'Esteira ergométrica', 'Walking_Treadmill/0.jpg', null, 'cardio'),
  ex('esteira_liss', 'Esteira — trote leve Z2 (35 min)', 'Esteira ergométrica', 'Jogging_Treadmill/0.jpg', null, 'cardio'),
  ex('esteira_interv', 'Esteira — intervalado 1:1 (20 min)', 'Esteira ergométrica', 'Jogging_Treadmill/0.jpg', null, 'cardio'),
  ex('bike_hiit', 'Bicicleta — HIIT 30 s / 60 s (15 min)', 'Bicicleta ergométrica vertical', 'Bicycling_Stationary/0.jpg', null, 'cardio'),
  ex('bike_liss', 'Bicicleta — Z2 constante (25 min)', 'Bicicleta ergométrica vertical', 'Bicycling_Stationary/0.jpg', null, 'cardio'),
];

export const CATALOG_MAP = new Map(CATALOG.map(e => [e.key, e]));
