import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { getDashboard } from '../src/services/dashboardService.js';
import { prisma } from '../src/lib/prisma.js';

test('dashboard usa automaticamente o período mais recente', async () => {
  const result = await getDashboard();
  assert.deepEqual(result.periodo, { mes: 9, ano: 2026, vendas: 3896, entradas: 3087, label: '09/2026' });
  assert.equal(result.vendas.quantidade, 3896);
  assert.equal(result.entradas.quantidade, 3087);
  assert.equal(result.vendas.variacaoPercentual, -3.66);
  assert.equal(result.entradas.variacaoPercentual, -5.83);
  assert.equal(result.reposicao.sugestoes, 324);
  assert.equal(result.reposicao.quantidadeSugerida, 907);
});

test('dashboard aceita período explícito e trata ausência de cálculo', async () => {
  const result = await getDashboard({ mes: '8', ano: '2026' });
  assert.equal(result.periodo.label, '08/2026');
  assert.equal(result.vendas.quantidade, 4044);
  assert.equal(result.entradas.quantidade, 3278);
  assert.equal(result.reposicao.possuiCalculo, false);
  assert.equal(result.vendas.variacaoPercentual, null);
});

test('dashboard rejeita período inexistente', async () => {
  await assert.rejects(() => getDashboard({ mes: '10', ano: '2026' }), (error) => error.code === 'DASHBOARD_PERIOD_NOT_FOUND');
});

after(async () => prisma.$disconnect());
