import { hasWorkoutKeyword } from './validators';

describe('Validators', () => {
  describe('hasWorkoutKeyword', () => {
    it('should detect valid workout messages', () => {
      expect(hasWorkoutKeyword('Eu treinei hoje!')).toBe(true);
      expect(hasWorkoutKeyword('Treinei agora mesmo')).toBe(true);
      expect(hasWorkoutKeyword('Acabei de ser treinado')).toBe(true);
      expect(hasWorkoutKeyword('EU TREINEI NA ACADEMIA')).toBe(true);
      expect(hasWorkoutKeyword('Hoje eu treinei muito forte')).toBe(true);
    });

    it('should reject non-workout messages', () => {
      expect(hasWorkoutKeyword('Bom dia')).toBe(false);
      expect(hasWorkoutKeyword('Vou treinar amanhã')).toBe(false);
      expect(hasWorkoutKeyword('Preciso treinar')).toBe(false);
      expect(hasWorkoutKeyword('treinar é bom')).toBe(false);
      expect(hasWorkoutKeyword('Treinamento completo')).toBe(false);
      expect(hasWorkoutKeyword('')).toBe(false);
    });

    it('should reject negative messages', () => {
      expect(hasWorkoutKeyword('Eu não treinei hoje')).toBe(false);
      expect(hasWorkoutKeyword('Não treinei')).toBe(false);
      expect(hasWorkoutKeyword('Hoje não treinei')).toBe(false);
      expect(hasWorkoutKeyword('nunca treinei')).toBe(false);
      expect(hasWorkoutKeyword('jamais treinei')).toBe(false);
    });

    it('should handle variations of negation', () => {
      expect(hasWorkoutKeyword('nao treinei')).toBe(false); // standard 'nao' without accent
      expect(hasWorkoutKeyword('Eu nao treinei')).toBe(false);
    });
  });
});
