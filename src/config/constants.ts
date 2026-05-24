export const WORKOUT_KEYWORDS = [
    'eu treinei', 'treinei', 'treinado', 'tá pago', 'ta pago', 'treininho',
    'fui na academia', 'fui malhar', 'malhei', 'paguei a academia',
    'treino feito', 'treino pago', 'acabei de treinar'
];
export const CARDIO_KEYWORDS = [
    'eu fiz cardio', 'fiz cardio', 'cardio pago', 'cardio de hoje', 'cardio feito',
    'corri hoje', 'fui correr', 'fiz esteira', 'fiz bicicleta', 'cardio concluído'
];

export const WATER_GOAL_ML = 2000;
export const WATER_CELEBRATION_ML = 3000;

export const METRIC_LIMITS = {
    weight:      { min: 20,  max: 400, unit: 'kg' },
    height:      { min: 50,  max: 250, unit: 'cm' },
    body_fat:    { min: 1,   max: 70,  unit: '%' },
    muscle_mass: { min: 1,   max: 70,  unit: '%' },
    steps:       { min: 0,   max: 100000, unit: 'passos' },
    sleep:       { min: 0,   max: 24,  unit: 'h' },
    water:       { min: 50,  max: 5000, unit: 'ml' },
} as const;

export const BOT_MESSAGES = {
    ERROR_GENERIC: 'Erro ao processar sua solicitação.',
    METRIC_OUT_OF_RANGE: (label: string, min: number, max: number, unit: string) =>
        `❌ Valor inválido para ${label}. Esperado entre ${min} e ${max}${unit}.`,
};
