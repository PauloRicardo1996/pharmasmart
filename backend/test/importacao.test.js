import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { validateImportPackage } from '../src/services/importacaoService.js';

function file(name, content) { return { originalname: name, size: Buffer.byteLength(content), buffer: Buffer.from(content) }; }
function packageFiles({ stock, entries, sales }) { return { estoque: [file('estoque.csv', stock)], entradas: [file('entradas.csv', entries)], vendas: [file('vendas.csv', sales)] }; }
function workbookFile(name, rows, bookType) { const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Dados'); const buffer = XLSX.write(workbook, { type: 'buffer', bookType }); return { originalname: name, size: buffer.length, buffer }; }

const stock = `codigo,estoque\n1001,10\n1002,-2\n1003,2000001\n`;
const entries = `produto,documento,data,quantidade,valor,codigo_sujeito,razao_social,cod_barra\n1001,NF-1,15/08/2026,4,10,S1,Fornecedor A,7890001\n1001,NF-1,15/08/2026,4,10,S1,Fornecedor A,7890002\n1002,NF-2,20/08/2026,2,5,S1,Fornecedor A,7890003\n`;
const sales = `produto,documento,data,quantidade,total,total_bruto,desconto,vendedor,caixa,grupo,sub_grupo\n1001,V-1,16/08/2026,3,30,32,2,Ana,1,MEDICAMENTOS,GENERICO\n1002,V-2,21/08/2026,1,5,5,0,Beto,1,MEDICAMENTOS,SIMILAR\n`;

test('valida pacote mensal, warnings e cruzamento', () => {
  const result = validateImportPackage({ files: packageFiles({ stock, entries, sales }), month: 8, year: 2026 });
  assert.equal(result.persistido, false);
  assert.equal(result.entradas.entradasUnicas, 2);
  assert.equal(result.entradas.duplicidadesPorCodigoBarra, 1);
  assert.equal(result.estoque.negativos, 1);
  assert.equal(result.cruzamento.encontradosNosTres, 2);
  assert.ok(result.warnings.some((warning) => warning.message.includes('estoque negativo')));
  assert.ok(result.warnings.some((warning) => warning.message.includes('incompatíveis')));
});

test('exige os três arquivos', () => {
  assert.throws(() => validateImportPackage({ files: { estoque: [file('estoque.csv', stock)], entradas: [file('entradas.csv', entries)] }, month: 8, year: 2026 }), /Informe o relatório de Vendas/);
});

test('rejeita excesso de registros fora do período', () => {
  const wrongPeriodSales = sales.replaceAll('08/2026', '09/2026');
  assert.throws(() => validateImportPackage({ files: packageFiles({ stock, entries, sales: wrongPeriodSales }), month: 8, year: 2026 }), /não corresponde ao período/);
});

test('lê XLS e XLSX em memória', () => {
  const stockRows = [['codigo', 'estoque'], ['1001', 5]];
  const entryRows = [['produto', 'documento', 'data', 'quantidade', 'valor'], ['1001', 'NF-1', '15/08/2026', 2, 10]];
  const salesRows = [['produto', 'documento', 'data', 'quantidade', 'total'], ['1001', 'V-1', '16/08/2026', 1, 10]];
  const result = validateImportPackage({ files: { estoque: [workbookFile('estoque.xls', stockRows, 'xls')], entradas: [workbookFile('entradas.xlsx', entryRows, 'xlsx')], vendas: [workbookFile('vendas.xlsx', salesRows, 'xlsx')] }, month: 8, year: 2026 });
  assert.equal(result.status, 'PREPARADO_PARA_IMPORTACAO');
  assert.equal(result.cruzamento.encontradosNosTres, 1);
});
