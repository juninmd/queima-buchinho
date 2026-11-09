export interface Today {
  habits: Record<string, boolean>;
  water: { ml: number; goalMl: number; paceMl: number };
  streak: number;
  trained: boolean;
  pauseUntil: string | null;
}
export type Kind = 'ficha' | 'refeicao' | 'agua' | 'fechamento';
export interface Reminder { id: string; time: string; kind: Kind; title: string; detail: string; done: boolean }
export interface Config { baseUrl: string; token: string }
