import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportFile } from '../src/utils/importacaoParser.js';
import { decimalQuantity, resolveTipoProduto } from '../src/services/importacaoService.js';

function csvFile(text) {
  return Buffer.from(text, 'utf8');
}

test('preserva estoque inteiro, fracionário e negativo fracionário', () => {
  const result = parseImportFile(csvFile('codigo,estoque\n1001,10\n1002,10.5\n1003,-0.5\n'), 'estoque.csv', 'estoque', 8, 2026);
  assert.deepEqual(result.linhas.map((row) => row.quantidade), [10, 10.5, -0.5]);
  assert.equal(result.negativos, 1);
  assert.equal(decimalQuantity(10).toString(), '10');
  assert.equal(decimalQuantity(10.5).toString(), '10.5');
  assert.equal(decimalQuantity(-0.5).toString(), '-0.5');
});

test('classifica somente evidências seguras e usa NAO_CLASSIFICADO sem fallback MARCA', () => {
  assert.equal(resolveTipoProduto({ nome: 'Produto GENERICO', grupo: '', subGrupo: '' }), 'GENERICO');
  assert.equal(resolveTipoProduto({ nome: 'Produto SIMILAR', grupo: '', subGrupo: '' }), 'SIMILAR');
  assert.equal(resolveTipoProduto({ nome: 'Produto sem classificação', grupo: 'OTC', subGrupo: 'PERFUMARIA' }), 'NAO_CLASSIFICADO');
  assert.notEqual(resolveTipoProduto({ nome: 'Produto sem classificação', grupo: '', subGrupo: '' }), 'MARCA');
});
