/** Exercício do catálogo curado: nome do aparelho + imagem + carga inicial sugerida. */
export interface CatalogEntry {
  key: string;
  nome: string;
  aparelho: string;
  img: string;
  /** `null` = exercício sem carga externa (peso do corpo ou cárdio). */
  cargaPadraoKg: number | null;
}

/** Prescrição de um exercício dentro de um dia do plano. */
export interface PlanItem {
  key: string;
  series: number;
  /** Texto livre porque queima de gordura usa tempo tanto quanto repetição: `'12-15'`, `'40 s'`, `'40 m'`. */
  reps: string;
  descansoS: number;
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
}

/** Ficha do dia entregue no Telegram. `exercicios` termina sempre com o bloco de cárdio. */
export interface Ficha {
  planKey: string;
  emoji: string;
  titulo: string;
  foco: string;
  metodo: string;
  data: string;
  exercicios: FichaExercise[];
}
