import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { derivarStatusOperacional, listarSugestoes, obterSugestao } from '../src/services/reposicaoService.js';
import { prisma } from '../src/lib/prisma.js';

test('consulta de sugestões oferece paginação, filtros, busca e ordenação', async () => {
  const all = await listarSugestoes({ page: 1, limit: 20 });
  assert.ok(all.pagination.total > 0);
  assert.equal(all.data.length, Math.min(20, all.pagination.total));
  assert.equal(all.data[0].calculo.risco, 'CRITICO');

  const pageTwo = await listarSugestoes({ page: 2, limit: 20 });
  assert.equal(pageTwo.pagination.page, 2);
  assert.ok(pageTwo.data.every((item) => item.id !== all.data[0].id));

  const critical = await listarSugestoes({ risco: 'CRITICO', limit: 100 });
  assert.ok(critical.data.length > 0);
  assert.ok(critical.data.every((item) => item.calculo.risco === 'CRITICO'));

  const code = all.data[0].produto.codigoExterno;
  const searched = await listarSugestoes({ search: code, limit: 20 });
  assert.ok(searched.data.some((item) => item.produto.codigoExterno === code));
});

test('detalhe da sugestão reúne produto, histórico e cálculo em uma consulta lógica', async () => {
  const list = await listarSugestoes({ page: 1, limit: 1 });
  const detail = await obterSugestao(list.data[0].id);
  assert.equal(detail.id, list.data[0].id);
  assert.ok(detail.produto);
  assert.ok(Array.isArray(detail.produto.historicoVendas));
  assert.ok(detail.calculo);
  assert.equal(await obterSugestao(999999999), null);
});

after(async () => prisma.$disconnect());

test('deriva o status operacional conforme o histórico de acompanhamentos', () => {
  const pedido = (id, status, dataPedido) => ({ id, status, dataPedido, fornecedor: null });
  assert.deepEqual(derivarStatusOperacional({ itensPedido: [] }), { statusOperacional: 'PENDENTE', podeRegistrarPedido: true, pedidoAtual: null, ultimoPedido: null });
  assert.equal(derivarStatusOperacional({ itensPedido: [{ pedido: pedido(1, 'PENDENTE', '2026-09-01') }] }).podeRegistrarPedido, false);
  assert.equal(derivarStatusOperacional({ itensPedido: [{ pedido: pedido(2, 'PEDIDO', '2026-09-02') }] }).statusOperacional, 'PEDIDO');
  assert.equal(derivarStatusOperacional({ itensPedido: [{ pedido: pedido(3, 'RECEBIDO', '2026-09-03') }] }).statusOperacional, 'RECEBIDO');
  assert.equal(derivarStatusOperacional({ itensPedido: [{ pedido: pedido(4, 'CANCELADO', '2026-09-04') }] }).statusOperacional, 'CANCELADO');
  const reopened = derivarStatusOperacional({ itensPedido: [{ pedido: pedido(4, 'CANCELADO', '2026-09-04') }, { pedido: pedido(5, 'PENDENTE', '2026-09-05') }] });
  assert.equal(reopened.statusOperacional, 'PENDENTE');
  assert.equal(reopened.podeRegistrarPedido, false);
  assert.equal(reopened.pedidoAtual.id, 5);
});