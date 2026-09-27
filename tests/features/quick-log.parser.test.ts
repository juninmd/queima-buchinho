import { parseQuickLog } from '../../src/features/quick-log/parser';

describe('parseQuickLog', () => {
  it.each([
    ['bebi 500ml', { kind: 'water', ml: 500 }],
    ['Bebi 500 ml de água', { kind: 'water', ml: 500 }],
    ['tomei 1,5l', { kind: 'water', ml: 1500 }],
    ['já bebi 2 litros hoje', { kind: 'water', ml: 2000 }],
    ['bebi 2 copos', { kind: 'water', ml: 500 }],
    ['pesei 82,5', { kind: 'weight', kg: 82.5 }],
    ['Peso: 82.4 kg', { kind: 'weight', kg: 82.4 }],
    ['hoje pesei 80 quilos', { kind: 'weight', kg: 80 }],
    ['treinei', { kind: 'workout' }],
    ['Treinei perna hoje!', { kind: 'workout' }],
    ['fui na academia', { kind: 'workout' }],
    ['fiz cárdio', { kind: 'cardio' }],
    ['corri 5km hoje', { kind: 'cardio' }],
  ])('recognizes %p', (text, expected) => expect(parseQuickLog(text)).toEqual(expected));

  it.each([
    'não treinei', 'nem bebi 500ml', 'ainda não fiz cardio',
    'bebi 500ml?', 'treinei?',
    'bebi 2l de cerveja',
    'o peso da mochila é 20 kg',
    'treinei muito pesado ontem e hoje estou morto de dor',
    'mika, bom dia', '',
  ])('ignores %p (goes to the Mika conversation)', text => expect(parseQuickLog(text)).toBeNull());
});
