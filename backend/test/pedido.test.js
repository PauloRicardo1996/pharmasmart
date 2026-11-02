import assert from 'node:assert/strict';
import test from 'node:test';
import { validateItems, validateStatusTransition } from '../src/services/pedidoService.js';

test('acompanhamento exige itens, quantidade positiva e não aceita duplicidade', () => {
  assert.throws(() => validateItems([]), /pelo menos um item/);
  assert.throws(() => validateItems([{ sugestaoId: 1, quantidade: 0, valorUnitario: 1 }]), /inteiro maior/);
  assert.throws(() => validateItems([{ sugestaoId: 1, quantidade: 1, valorUnitario: 1 }, { sugestaoId: 1, quantidade: 1, valorUnitario: 1 }]), /mesma sugestão/);
});

test('preço unitário é opcional e preserva Decimal quando informado', () => {
  const [withoutPrice] = validateItems([{ sugestaoId: 10, quantidade: 3 }]);
  assert.equal(withoutPrice.precoUnitario, null);
  const [withPrice] = validateItems([{ sugestaoId: 10, quantidade: 3, valorUnitario: '2,50' }]);
  assert.equal(withPrice.precoUnitario.toString(), '2.5');
});

test('transições operacionais permitidas e estados finais', () => {
  assert.doesNotThrow(() => validateStatusTransition('PENDENTE', 'PEDIDO'));
  assert.doesNotThrow(() => validateStatusTransition('PEDIDO', 'RECEBIDO'));
  assert.doesNotThrow(() => validateStatusTransition('PENDENTE', 'CANCELADO'));
  assert.doesNotThrow(() => validateStatusTransition('PEDIDO', 'CANCELADO'));
  assert.throws(() => validateStatusTransition('RECEBIDO', 'PEDIDO'), /não é permitida/);
  assert.throws(() => validateStatusTransition('CANCELADO', 'RECEBIDO'), /não é permitida/);
  assert.throws(() => validateStatusTransition('ABERTO', 'PEDIDO'), /não é permitida/);
});
