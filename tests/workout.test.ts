import { WORKOUT_KEYWORDS } from '../src/config/constants';

function hasWorkoutKeyword(text: string): boolean {
    const lowerText = text.toLowerCase();
    return WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

describe('Workout Keyword Validation', () => {
    const testCases = [
        { message: 'Eu treinei hoje!', expected: true },
        { message: 'Treinei agora mesmo', expected: true },
        { message: 'Acabei de ser treinado', expected: true },
        { message: 'EU TREINEI NA ACADEMIA', expected: true },
        { message: 'Hoje eu treinei muito forte', expected: true },
        { message: 'tá pago', expected: true },
        { message: 'ta pago', expected: true },
        { message: 'Bom dia', expected: false },
        { message: 'Vou treinar amanhã', expected: false },
        { message: 'Preciso treinar', expected: false },
    ];

    testCases.forEach(({ message, expected }) => {
        it(`should return ${expected} for "${message}"`, () => {
            expect(hasWorkoutKeyword(message)).toBe(expected);
        });
    });
});
