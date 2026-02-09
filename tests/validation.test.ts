/**
 * Testes para validação de palavras-chave de treino
 * Este arquivo testa a lógica de detecção sem precisar de um bot real
 */

// Palavras-chave para validar treino
const WORKOUT_KEYWORDS = ['eu treinei', 'treinei', 'treinado'];

// Função para verificar se a mensagem contém palavras de treino
function hasWorkoutKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Testes
console.log('🧪 Executando testes de validação de mensagens...\n');

const testCases = [
  { message: 'Eu treinei hoje!', expected: true },
  { message: 'Treinei agora mesmo', expected: true },
  { message: 'Acabei de ser treinado', expected: true },
  { message: 'EU TREINEI NA ACADEMIA', expected: true },
  { message: 'Hoje eu treinei muito forte', expected: true },
  { message: 'Bom dia', expected: false },
  { message: 'Vou treinar amanhã', expected: false },
  { message: 'Preciso treinar', expected: false },
  { message: 'treinar é bom', expected: false },
  { message: 'Treinamento completo', expected: false },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = hasWorkoutKeyword(test.message);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} Teste ${index + 1}: "${test.message}"`);
  console.log(`   Esperado: ${test.expected}, Recebido: ${result}\n`);
});

console.log('\n📊 Resultado dos testes:');
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`📈 Total: ${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 Todos os testes passaram!');
  process.exit(0);
} else {
  console.log('\n⚠️ Alguns testes falharam!');
  process.exit(1);
}
