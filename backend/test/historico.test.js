import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { listarHistorico, obterHistoricoProduto } from '../src/services/historicoService.js';
import { prisma } from '../src/lib/prisma.js';

test('histórico identifica período mais recente e totais reais', async () => {
  const result = await listarHistorico();
  assert.equal(result.periodo.label, '09/2026');
  assert.equal(result.periodoAnterior.label, '08/2026');
  assert.equal(result.resumo.quantidadeVendida, 3896);
  assert.equal(result.resumo.produtosVendidos, 1344);
  assert.equal(result.historicoDisponivel, 2);
});

test('histórico aceita período explícito sem inventar comparação anterior', async () => {
  const result = await listarHistorico({ mes: '8', ano: '2026' });
  assert.equal(result.resumo.quantidadeVendida, 4044);
  assert.equal(result.resumo.produtosVendidos, 1355);
  assert.equal(result.periodoAnterior, null);
  assert.equal(result.items[0].variacaoPercentual, null);
  assert.equal(result.items[0].tendencia, null);
});

test('histórico suporta busca, grupo, subgrupo, paginação e tendências', async () => {
  const searched = await listarHistorico({ search: '32431' });
  assert.equal(searched.items.length, 1);
  assert.equal(searched.items[0].produto.codigoExterno, '32431');
  const grouped = await listarHistorico({ grupo: 'MEDICAMENTOS', subGrupo: 'GENERICO', limit: 5 });
  assert.ok(grouped.items.length <= 5);
  assert.ok(grouped.items.every((item) => item.produto.grupo === 'MEDICAMENTOS' && item.produto.subGrupo === 'GENERICO'));
  const page = await listarHistorico({ page: 2, limit: 20 });
  assert.equal(page.pagination.page, 2);
  for (const filter of ['AUMENTO', 'QUEDA', 'ESTAVEL', 'NOVA_DEMANDA', 'SEM_VENDA']) {
    const filtered = await listarHistorico({ tendencia: filter, limit: 1 });
    assert.ok(filtered.pagination.total > 0, `esperava registros para ${filter}`);
  }
});

test('detalhe reúne timeline, entradas, snapshots e vendas do produto', async () => {
  const list = await listarHistorico({ search: '32431' });
  const detail = await obterHistoricoProduto(list.items[0].produto.id, { mes: 9, ano: 2026 });
  assert.equal(detail.historico.length, 2);
  assert.ok(detail.historico.some((item) => item.label === '09/2026'));
  assert.ok(Array.isArray(detail.vendasDetalhadas));
  assert.equal(await obterHistoricoProduto(999999999), null);
});

after(async () => prisma.$disconnect());
