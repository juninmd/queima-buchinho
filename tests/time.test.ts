import { getBrasiliaDateString, getBrasiliaDayStart, formatBrasiliaTime, getSurpriseMessage } from '../src/utils/time';

console.log('🧪 Executando testes de tempo (Brasília Time)...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    failed++;
  }
}

// Test getBrasiliaDateString
try {
  const dateStr = getBrasiliaDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(dateStr), `Format YYYY-MM-DD correct: ${dateStr}`);
} catch (e) {
  console.log('❌ FAIL: getBrasiliaDateString threw error', e);
  failed++;
}

// Test getBrasiliaDayStart
try {
  const dayStart = getBrasiliaDayStart();
  assert(dayStart instanceof Date, 'Returns a Date object');
  assert(!isNaN(dayStart.getTime()), 'Date object is valid');
  // Check if it corresponds to midnight BRT (UTC-3)
  // Since we hardcoded the offset in implementation, we expect the ISO string to end in something that reflects that,
  // but dayStart.toISOString() will be in UTC.
  // Example: 2026-02-14T03:00:00.000Z
  const iso = dayStart.toISOString();
  // It should have T03:00:00.000Z if offset is -03:00
  assert(iso.includes('T03:00:00.000Z'), `Time is 03:00 UTC (00:00 BRT): ${iso}`);
} catch (e) {
  console.log('❌ FAIL: getBrasiliaDayStart threw error', e);
  failed++;
}

// Test formatBrasiliaTime
try {
  const timeStr = formatBrasiliaTime();
  assert(/^\d{2}:\d{2}$/.test(timeStr), `Format HH:mm correct: ${timeStr}`);
} catch (e) {
  console.log('❌ FAIL: formatBrasiliaTime threw error', e);
  failed++;
}

// Test getSurpriseMessage
try {
  const msg = getSurpriseMessage();
  assert(typeof msg === 'string' && msg.length > 0, `Returns a non-empty string: "${msg}"`);
} catch (e) {
  console.log('❌ FAIL: getSurpriseMessage threw error', e);
  failed++;
}

console.log('\n📊 Resultado dos testes de tempo:');
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 Todos os testes de tempo passaram!');
} else {
  console.log('\n⚠️ Alguns testes de tempo falharam!');
  process.exit(1);
}
