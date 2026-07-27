require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { PixService } = require('../src/services/PixService');

test('valida os dígitos verificadores de CPF e CNPJ usados como chave PIX', () => {
  assert.equal(PixService.validatePixKey('52998224725', 'cpf'), true);
  assert.equal(PixService.validatePixKey('52998224724', 'cpf'), false);
  assert.equal(PixService.validatePixKey('11111111111', 'cpf'), false);

  assert.equal(PixService.validatePixKey('11222333000181', 'cnpj'), true);
  assert.equal(PixService.validatePixKey('11222333000180', 'cnpj'), false);
  assert.equal(PixService.validatePixKey('00000000000000', 'cnpj'), false);
});
