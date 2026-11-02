import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { listarRelatorio, toCsv } from '../src/services/relatorioService.js';
import { prisma } from '../src/lib/prisma.js';

test('relatório de vendas usa os totais reais de setembro', async () => { const result = await listarRelatorio({ tipo: 'vendas', mes: 9, ano: 2026 }); assert.equal(result.resumo.quantidade, 3896); assert.equal(result.resumo.produtos, 1344); assert.equal(result.periodo.label, '09/2026'); });
test('relatório de entradas e estoque usam o período selecionado', async () => { const entries = await listarRelatorio({ tipo: 'entradas', mes: 9, ano: 2026 }); assert.equal(entries.resumo.quantidade, 3087); const stock = await listarRelatorio({ tipo: 'estoque', mes: 9, ano: 2026 }); assert.ok(stock.resumo.produtos > 0); assert.equal(stock.periodo.label, '09/2026'); });
test('relatório de reposição respeita período sem execução e filtros', async () => { const august = await listarRelatorio({ tipo: 'reposicao', mes: 8, ano: 2026 }); assert.equal(august.items.length, 0); const current = await listarRelatorio({ tipo: 'reposicao', mes: 9, ano: 2026, risco: 'CRITICO', limit: 5 }); assert.equal(current.resumo.calculos, 17); assert.ok(current.items.length <= 5); });
test('exportação CSV inclui BOM e separador compatível com Excel', async () => { const report = await listarRelatorio({ tipo: 'vendas', mes: 9, ano: 2026, limit: 2, export: true }); const csv = toCsv(report); assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('Produto')); assert.ok(csv.includes(';')); });
test('tipo de relatório inválido é rejeitado', async () => { await assert.rejects(() => listarRelatorio({ tipo: 'invalido' }), (error) => error.code === 'INVALID_REPORT_TYPE'); });

after(async () => prisma.$disconnect());
