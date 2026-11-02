import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { calcularCobertura, calcularDemandaDiaria, calcularDemandaMedia, calcularEstoqueAlvo, calcularEstoqueSeguranca, calcularQuantidadeSugerida, classificarConfiancaHistorico, classificarRisco, detectarAnomalia } from '../src/services/reposicaoService.js';

test('calcula demanda mensal e diária com precisão decimal', () => {
  assert.equal(calcularDemandaMedia([20, 30], 2).toString(), '25');
  assert.equal(calcularDemandaDiaria(new Prisma.Decimal('25')).toString(), '0.83333333333333333333');
});

test('calcula estoque alvo, segurança e sugestão positiva ou zero', () => {
  const alvo = calcularEstoqueAlvo(25, 30, 20);
  assert.equal(alvo.toString(), '30');
  assert.equal(calcularEstoqueSeguranca(25, 30, 20).toString(), '5');
  assert.equal(calcularQuantidadeSugerida(alvo, 10).toString(), '20');
  assert.equal(calcularQuantidadeSugerida(alvo, 35).toString(), '0');
});

test('trata estoque negativo e fracionário sem zerar o valor', () => {
  assert.equal(calcularCobertura('-2', '1').toString(), '0');
  assert.equal(calcularQuantidadeSugerida('20', '-2').toString(), '22');
  assert.equal(calcularQuantidadeSugerida('20.5', '10.25').toString(), '10.25');
});

test('classifica demanda zero, risco, confiança e anomalia', () => {
  assert.equal(classificarRisco({ estoqueAtual: 0, coberturaDias: 0, demandaMediaMensal: 10 }), 'CRITICO');
  assert.equal(classificarRisco({ estoqueAtual: 10, coberturaDias: 10, demandaMediaMensal: 10 }), 'ALTO');
  assert.equal(classificarRisco({ estoqueAtual: 20, coberturaDias: 20, demandaMediaMensal: 10 }), 'MEDIO');
  assert.equal(classificarRisco({ estoqueAtual: 40, coberturaDias: 40, demandaMediaMensal: 10 }), 'BAIXO');
  assert.equal(classificarRisco({ estoqueAtual: 40, coberturaDias: null, demandaMediaMensal: 0 }), 'SEM_DEMANDA');
  assert.equal(classificarRisco({ estoqueAtual: 7890000002, coberturaDias: 10, demandaMediaMensal: 10, dadoAnomalo: true }), 'DADO_ANOMALO');
  assert.equal(classificarConfiancaHistorico(1), 'BAIXA');
  assert.equal(classificarConfiancaHistorico(2), 'BAIXA');
  assert.equal(classificarConfiancaHistorico(3), 'MEDIA');
  assert.equal(classificarConfiancaHistorico(6), 'ALTA');
  assert.equal(detectarAnomalia('7890000002'), true);
  assert.equal(detectarAnomalia('10.5'), false);
});
