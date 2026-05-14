export interface Exercise {
  name: string;
  sets: string;
}

export interface GymDay {
  muscleGroup: string;
  emoji: string;
  focus: string;
  exercises: Exercise[];
  rest: boolean;
}

export const GYM_PLAN: Record<string, GymDay> = {
  'segunda-feira': {
    muscleGroup: 'Peito + Tríceps',
    emoji: '🏋️',
    focus: 'Empurrar horizontal',
    rest: false,
    exercises: [
      { name: 'Supino reto com barra', sets: '4x8-10' },
      { name: 'Supino inclinado com halteres', sets: '3x10-12' },
      { name: 'Crucifixo na máquina (peck deck)', sets: '3x12' },
      { name: 'Tríceps pulley corda', sets: '4x12' },
      { name: 'Tríceps francês com halter', sets: '3x10' },
      { name: 'Mergulho no banco (dips)', sets: '3x12' },
    ]
  },
  'terça-feira': {
    muscleGroup: 'Costas + Bíceps',
    emoji: '💪',
    focus: 'Puxar vertical e horizontal',
    rest: false,
    exercises: [
      { name: 'Puxada frontal (barra larga)', sets: '4x10' },
      { name: 'Remada curvada com barra', sets: '4x8-10' },
      { name: 'Remada unilateral com halter', sets: '3x12' },
      { name: 'Pulley baixo (remada sentado)', sets: '3x12' },
      { name: 'Rosca direta com barra', sets: '4x10' },
      { name: 'Rosca alternada com halteres', sets: '3x12' },
    ]
  },
  'quarta-feira': {
    muscleGroup: 'Pernas + Glúteo',
    emoji: '🦵',
    focus: 'Quadríceps, posterior e glúteo',
    rest: false,
    exercises: [
      { name: 'Agachamento livre com barra', sets: '4x8-10' },
      { name: 'Leg press 45°', sets: '4x12' },
      { name: 'Extensão de pernas (cadeira)', sets: '3x15' },
      { name: 'Flexão de pernas (mesa)', sets: '3x12' },
      { name: 'Stiff com halteres', sets: '3x12' },
      { name: 'Panturrilha em pé no smith', sets: '4x15' },
    ]
  },
  'quinta-feira': {
    muscleGroup: 'Ombros + Trapézio',
    emoji: '🔝',
    focus: 'Empurrar vertical e lateral',
    rest: false,
    exercises: [
      { name: 'Desenvolvimento com halteres', sets: '4x10' },
      { name: 'Elevação lateral com halteres', sets: '4x12-15' },
      { name: 'Elevação frontal alternada', sets: '3x12' },
      { name: 'Crucifixo invertido (posterior)', sets: '3x15' },
      { name: 'Encolhimento com halteres', sets: '4x15' },
      { name: 'Face pull na polia', sets: '3x15' },
    ]
  },
  'sexta-feira': {
    muscleGroup: 'Peito + Costas (Full Upper)',
    emoji: '💥',
    focus: 'Treino fullbody superior',
    rest: false,
    exercises: [
      { name: 'Supino inclinado halteres', sets: '4x10' },
      { name: 'Puxada fechada (supinada)', sets: '4x10' },
      { name: 'Crossover polia alta', sets: '3x12' },
      { name: 'Remada alta com corda', sets: '3x12' },
      { name: 'Tríceps testa com barra W', sets: '3x12' },
      { name: 'Rosca concentrada', sets: '3x12' },
    ]
  },
  'sábado': {
    muscleGroup: 'Pernas (foco posterior)',
    emoji: '🍑',
    focus: 'Posterior de coxa e glúteo',
    rest: false,
    exercises: [
      { name: 'Levantamento terra romeno', sets: '4x8-10' },
      { name: 'Agachamento sumô com halter', sets: '4x12' },
      { name: 'Mesa flexora', sets: '4x12' },
      { name: 'Cadeira abdutora', sets: '3x15' },
      { name: 'Elevação pélvica (hip thrust)', sets: '4x12' },
      { name: 'Panturrilha sentado na máquina', sets: '4x20' },
    ]
  },
  'domingo': {
    muscleGroup: 'Descanso Ativo',
    emoji: '😴',
    focus: 'Recuperação muscular',
    rest: true,
    exercises: [
      { name: 'Alongamento geral', sets: '10 min' },
      { name: 'Caminhada leve (opcional)', sets: '20-30 min' },
    ]
  }
};
