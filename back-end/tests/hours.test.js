require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRestaurantOpenNow,
  normalizeOperatingHours,
  validateOperatingHours,
} = require('../src/utils/hours');

const fullWeek = (dayOverrides = {}) => {
  const closed = { enabled: false, shifts: [{ open: '18:00', close: '23:00' }] };
  return {
    dom: { ...closed }, seg: { ...closed }, ter: { ...closed },
    qua: { ...closed }, qui: { ...closed }, sex: { ...closed },
    sab: { ...closed }, ...dayOverrides,
  };
};

test('abre no início e fecha exatamente no fim do turno', () => {
  const hours = fullWeek({ seg: { enabled: true, shifts: [{ open: '18:00', close: '23:00' }] } });
  assert.equal(isRestaurantOpenNow(hours, new Date(2026, 6, 20, 17, 59)), false);
  assert.equal(isRestaurantOpenNow(hours, new Date(2026, 6, 20, 18, 0)), true);
  assert.equal(isRestaurantOpenNow(hours, new Date(2026, 6, 20, 23, 0)), false);
});

test('mantém turno ativo depois da meia-noite com base no dia anterior', () => {
  const hours = fullWeek({ seg: { enabled: true, shifts: [{ open: '22:00', close: '02:00' }] } });
  assert.equal(isRestaurantOpenNow(hours, new Date(2026, 6, 21, 1, 30)), true);
  assert.equal(isRestaurantOpenNow(hours, new Date(2026, 6, 21, 2, 0)), false);
});

test('ordena múltiplos turnos pelo horário de abertura', () => {
  const hours = fullWeek({
    seg: { enabled: true, shifts: [
      { open: '18:00', close: '20:00' },
      { open: '12:00', close: '14:00' },
    ] },
  });
  assert.deepEqual(
    normalizeOperatingHours(hours).seg.shifts.map((shift) => shift.open),
    ['12:00', '18:00']
  );
});

test('rejeita horário inválido, igual e turnos sobrepostos', () => {
  const invalidTime = fullWeek({ seg: { enabled: true, shifts: [{ open: '25:00', close: '23:00' }] } });
  const equalTime = fullWeek({ seg: { enabled: true, shifts: [{ open: '18:00', close: '18:00' }] } });
  const overlap = fullWeek({ seg: { enabled: true, shifts: [
    { open: '12:00', close: '15:00' },
    { open: '14:00', close: '17:00' },
  ] } });
  assert.equal(validateOperatingHours(invalidTime).valid, false);
  assert.equal(validateOperatingHours(equalTime).valid, false);
  assert.equal(validateOperatingHours(overlap).valid, false);
});
