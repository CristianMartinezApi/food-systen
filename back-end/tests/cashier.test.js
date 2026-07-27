require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateExpectedCash, canWithdrawCash } = require('../src/utils/cashier');

test('calcula o dinheiro esperado somente com componentes físicos do caixa', () => {
  assert.equal(calculateExpectedCash({
    openingAmount: 100,
    supplies: 50,
    withdrawals: 20,
    adjustments: 5,
    cashSales: 80,
  }), 215);
});

test('mantém precisão monetária em operações decimais', () => {
  assert.equal(calculateExpectedCash({
    openingAmount: 0.1,
    supplies: 0.2,
    withdrawals: 0,
    adjustments: 0,
    cashSales: 0,
  }), 0.3);
});

test('permite sangria até o saldo disponível e rejeita excesso', () => {
  const balance = {
    openingAmount: 100,
    supplies: 0,
    withdrawals: 30,
    adjustments: 0,
    cashSales: 20,
  };
  assert.equal(canWithdrawCash(90, balance), true);
  assert.equal(canWithdrawCash(90.01, balance), false);
});

test('aceita abertura zerada no cálculo do caixa', () => {
  assert.equal(calculateExpectedCash({
    openingAmount: 0,
    supplies: 0,
    withdrawals: 0,
    adjustments: 0,
    cashSales: 25,
  }), 25);
});
