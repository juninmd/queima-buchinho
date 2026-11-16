/** Grupo muscular principal — usado para auditar o volume semanal de cada músculo. */
export type Grupo =
  | 'quadriceps' | 'posterior' | 'panturrilha' | 'peito' | 'costas' | 'ombro'
  | 'biceps' | 'triceps' | 'core' | 'full' | 'cardio';

/** Exercício do catálogo curado: nome do aparelho + imagem + carga inicial sugerida. */
export interface CatalogEntry {
  key: string;
  nome: string;
  aparelho: string;
  img: string;
  /** `null` = exercício sem carga externa (peso do corpo ou cárdio). */
  cargaPadraoKg: number | null;
  grupo: Grupo;
}

/** Prescrição de um exercício dentro de um dia do plano. */
export interface PlanItem {
  key: string;
  series: number;
  /** Texto livre porque queima de gordura usa tempo tanto quanto repetição: `'12-15'`, `'40 s'`, `'40 m'`. */
  reps: string;
  descansoS: number;
  /** Variação do mesmo grupo muscular usada no bloco B do mesociclo. */
  alt?: string;
}

/** Semana do mesociclo de 4 semanas (3 de carga progressiva + 1 de deload) e bloco de variação. */
export interface Fase {
  semana: 1 | 2 | 3 | 4;
  bloco: 'A' | 'B';
  nome: string;
  dica: string;
  deload: boolean;
}

/** Um dia do plano de queima de gordura. O cárdio é obrigatório e sempre fecha o treino. */
export interface DayPlan {
  key: string;
  emoji: string;
  titulo: string;
  foco: string;
  metodo: string;
  itens: PlanItem[];
  cardio: PlanItem;
}

/** Exercício já resolvido contra o catálogo e a carga persistida do usuário. */
export interface FichaExercise extends PlanItem {
  nome: string;
  aparelho: string;
  img: string;
  /** `null` = sem carga ajustável (o botão de carga não aparece). */
  cargaKg: number | null;
  /** Passo da progressão dupla: quanto subir quando bater o topo da faixa de reps. */
  incrementoKg: number;
}

/** Ficha do dia entregue no Telegram. `exercicios` termina sempre com o bloco de cárdio. */
export interface Ficha {
  planKey: string;
  emoji: string;
  titulo: string;
  foco: string;
  metodo: string;
  data: string;
  fase: Fase;
  exercicios: FichaExercise[];
}
