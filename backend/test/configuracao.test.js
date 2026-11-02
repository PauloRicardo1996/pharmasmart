import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Prisma } from '@prisma/client';
import { simularReposicao } from '../src/services/reposicaoService.js';
import { validate } from '../src/services/configuracaoService.js';
import { prisma } from '../src/lib/prisma.js';

test('valida cobertura e margem dos parâmetros globais', () => {
  const result = validate({ coberturaDesejadaDias: 45, margemSegurancaPercentual: '25' });
  assert.equal(result.cobertura.toString(), '45');
  assert.equal(result.margem.toString(), '25');
  assert.throws(() => validate({ coberturaDesejadaDias: 0, margemSegurancaPercentual: 20 }), /1 e 365/);
  assert.throws(() => validate({ coberturaDesejadaDias: 30, margemSegurancaPercentual: 101 }), /0% e 100%/);
});

test('simulação usa o parâmetro persistido e aceita override explícito', async () => {
  const current = await prisma.parametroReposicao.findFirst({ orderBy: { id: 'desc' } });
  assert.ok(current);
  assert.equal(current.coberturaDesejadaDias.toString(), '30');
  const persisted = await simularReposicao({});
  assert.equal(persisted.parametros.coberturaDesejadaDias, '30');
  const overridden = await simularReposicao({ coberturaDesejadaDias: new Prisma.Decimal(45), margemSegurancaPercentual: new Prisma.Decimal(25) });
  assert.equal(overridden.parametros.coberturaDesejadaDias, '45');
  assert.equal(overridden.parametros.margemSegurancaPercentual, '25');
});

after(async () => prisma.$disconnect());
