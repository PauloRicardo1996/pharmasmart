import XLSX from 'xlsx';

const HEADER_ALIASES = {
  codigoExterno: ['codigo_externo', 'codigo', 'cod_produto', 'produto_codigo', 'produto'],
  codigoBarra: ['codigo_barra', 'cod_barra', 'ean', 'ean13', 'gtin'],
  nomeProduto: ['nome_produto', 'produto_nome', 'descricao', 'nome'],
  quantidade: ['quantidade', 'qtd', 'quantidade_estoque', 'qtd_estoque', 'saldo', 'estoque', 'qem1'],
  qem1: ['qem1'],
  vem1: ['vem1'],
  qsm1: ['qsm1'],
  vsm1: ['vsm1'],
  documento: ['documento', 'doc', 'nota', 'numero_nota', 'numero_documento'],
  data: ['data', 'data_venda', 'data_entrada', 'data_movimento', 'dt_venda', 'dt_entrada'],
  valor: ['valor', 'valor_unitario', 'preco', 'preco_unitario', 'vem1'],
  custo: ['custo', 'custo_unitario'],
  total: ['total', 'total_produto', 'valor_total'],
  docTotal: ['doc_total', 'total_nota'],
  totalBruto: ['total_bruto', 'valor_bruto'],
  desconto: ['desconto', 'desconto_total'],
  vendedor: ['vendedor'],
  caixa: ['caixa'],
  codigoFornecedor: ['codigo_sujeito', 'codigo_fornecedor', 'fornecedor_codigo'],
  fornecedor: ['razao_social', 'fornecedor', 'nome_fornecedor'],
  filial: ['filial'],
  grupo: ['grupo'],
  subGrupo: ['sub_grupo', 'subgrupo'],
};

export function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizeCode(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isInteger(value)) return String(value);
  if (typeof value === 'number') return String(value).replace(/\.0+$/, '');
  return normalizeText(value);
}

export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = normalizeText(value).replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const text = normalizeText(value);
  if (!text) return null;
  const br = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (br) return new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])));
  const iso = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(value) {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function readWorkbook(buffer, filename) {
  if (!buffer?.length) throw new Error(`O arquivo ${filename} está vazio.`);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`O arquivo ${filename} não possui planilhas.`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true });
  if (rows.length < 2) throw new Error(`O arquivo ${filename} não possui linhas de dados.`);
  const originalHeaders = rows[0].map((value) => normalizeText(value));
  const headers = originalHeaders.map(normalizeHeader);
  const dataRows = rows.slice(1).filter((row) => row.some((value) => normalizeText(value) !== ''));
  return { filename, originalHeaders, headers, rows: dataRows };
}

function hasAny(headers, aliases) { return aliases.some((alias) => headers.includes(alias)); }
function findColumn(headers, key) { return HEADER_ALIASES[key].find((alias) => headers.includes(alias)) || null; }
function columnIndex(headers, key) { const column = findColumn(headers, key); return column ? headers.indexOf(column) : -1; }

function periodCheck(rows, dateIndex, month, year) {
  const withDates = rows.map((row) => parseDate(row[dateIndex])).filter(Boolean);
  if (!withDates.length) return { datedRows: 0, outsidePeriod: 0, severity: 'warning', message: 'Nenhuma data válida foi identificada para validar o período.' };
  const outsidePeriod = withDates.filter((date) => date.getUTCMonth() + 1 !== month || date.getUTCFullYear() !== year).length;
  if (!outsidePeriod) return { datedRows: withDates.length, outsidePeriod: 0, severity: null };
  const fewOutside = outsidePeriod / withDates.length <= 0.05;
  return {
    datedRows: withDates.length,
    outsidePeriod,
    severity: fewOutside ? 'warning' : 'error',
    message: fewOutside ? `${outsidePeriod} registro(s) estão fora do período selecionado.` : `Arquivo não corresponde ao período selecionado: ${outsidePeriod} registro(s) estão fora do período.`,
  };
}

function latestDate(rows, dateIndex, month, year) {
  if (dateIndex < 0) return null;
  const dates = rows.map((row) => parseDate(row[dateIndex])).filter((date) => date && date.getUTCMonth() + 1 === month && date.getUTCFullYear() === year);
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

function stockPreview(workbook, month, year) {
  const codeIndex = columnIndex(workbook.headers, 'codigoExterno');
  const quantityIndex = columnIndex(workbook.headers, 'quantidade');
  if (codeIndex < 0 || quantityIndex < 0) throw new Error('Não foi possível identificar código do produto e quantidade no relatório de estoque.');
  const nameIndex = columnIndex(workbook.headers, 'nomeProduto');
  const groupIndex = columnIndex(workbook.headers, 'grupo');
  const subGroupIndex = columnIndex(workbook.headers, 'subGrupo');
  const costIndex = columnIndex(workbook.headers, 'custo');
  const dateIndex = columnIndex(workbook.headers, 'data');
  const rows = workbook.rows.map((row, index) => ({
    linha: index + 2, codigoExterno: normalizeCode(row[codeIndex]), nomeProduto: normalizeText(row[nameIndex]), grupo: normalizeText(row[groupIndex]), subGrupo: normalizeText(row[subGroupIndex]), custo: parseNumber(row[costIndex]), quantidade: parseNumber(row[quantityIndex]), data: toIsoDate(row[dateIndex]),
  })).filter((row) => row.codigoExterno || row.quantidade !== null);
  const warnings = [];
  const negative = rows.filter((row) => (row.quantidade ?? 0) < 0);
  const anomalous = rows.filter((row) => Math.abs(row.quantidade ?? 0) > 1000000);
  if (negative.length) warnings.push(`${negative.length} produto(s) apresenta(m) estoque negativo.`);
  if (anomalous.length) warnings.push(`${anomalous.length} valor(es) de estoque parecem incompatíveis com uma quantidade normal.`);
  if (dateIndex >= 0) {
    const check = periodCheck(workbook.rows, dateIndex, month, year);
    if (check.message) warnings.push(check.message);
    if (check.severity === 'error') throw new Error(check.message);
  }
  return {
    tipo: 'estoque', formato: 'posição de estoque', headers: workbook.originalHeaders, totalLinhas: rows.length, produtos: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)).size,
    positivos: rows.filter((row) => row.quantidade > 0).length, zerados: rows.filter((row) => row.quantidade === 0).length, negativos: negative.length, warnings,
    produtosSet: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)), dataReferencia: latestDate(workbook.rows, dateIndex, month, year), linhas: rows, preview: rows.slice(0, 20),
  };
}

function parseEntries(workbook, month, year) {
  const codeIndex = columnIndex(workbook.headers, 'codigoExterno');
  const isSummary = hasAny(workbook.headers, HEADER_ALIASES.qem1) || hasAny(workbook.headers, HEADER_ALIASES.vem1);
  const isDetailed = codeIndex >= 0 && hasAny(workbook.headers, HEADER_ALIASES.documento) && hasAny(workbook.headers, HEADER_ALIASES.data);
  if (!isSummary && !isDetailed) throw new Error('Não foi possível identificar a estrutura do relatório de entradas.');
  if (codeIndex < 0) throw new Error('Não foi possível identificar o código externo do produto no relatório de entradas.');
  if (isSummary && !isDetailed) {
    const quantityIndex = columnIndex(workbook.headers, 'qem1');
    const valueIndex = columnIndex(workbook.headers, 'vem1');
    const nameIndex = columnIndex(workbook.headers, 'nomeProduto');
    const rows = workbook.rows.map((row, index) => ({ linha: index + 2, codigoExterno: normalizeCode(row[codeIndex]), nomeProduto: normalizeText(row[nameIndex]), quantidade: parseNumber(row[quantityIndex]), valor: parseNumber(row[valueIndex]) })).filter((row) => row.codigoExterno);
    return buildEntryResult(workbook, rows, 'entradas-resumo', month, year, false);
  }
  const indexes = Object.fromEntries(Object.keys(HEADER_ALIASES).map((key) => [key, columnIndex(workbook.headers, key)]));
  const originalRows = workbook.rows.map((row, index) => ({
    linha: index + 2, codigoExterno: normalizeCode(row[indexes.codigoExterno]), nomeProduto: normalizeText(row[indexes.nomeProduto]), quantidade: parseNumber(row[indexes.quantidade]), valor: parseNumber(row[indexes.valor]), total: parseNumber(row[indexes.total]), desconto: parseNumber(row[indexes.desconto]), documento: normalizeText(row[indexes.documento]), data: toIsoDate(row[indexes.data]), codigoFornecedor: normalizeCode(row[indexes.codigoFornecedor]), fornecedor: normalizeText(row[indexes.fornecedor]), filial: normalizeText(row[indexes.filial]), codigoBarra: normalizeCode(row[indexes.codigoBarra]),
  })).filter((row) => row.codigoExterno || row.documento);
  const groups = new Map();
  for (const row of originalRows) {
    const key = [row.codigoExterno, row.documento, row.data, row.quantidade, row.valor, row.codigoFornecedor, row.fornecedor].join('|');
    const group = groups.get(key) || { ...row, codigosBarra: new Set(), linhasOriginais: 0 };
    if (row.codigoBarra) group.codigosBarra.add(row.codigoBarra);
    group.linhasOriginais += 1;
    groups.set(key, group);
  }
  const rows = [...groups.values()].map(({ codigosBarra, ...row }) => ({ ...row, codigosBarra: [...codigosBarra] }));
  const duplicates = [...groups.values()].filter((group) => group.linhasOriginais > 1);
  return buildEntryResult(workbook, rows, 'entradas-detalhadas', month, year, true, originalRows.length, duplicates.reduce((sum, group) => sum + group.linhasOriginais - 1, 0), rows.reduce((sum, row) => sum + row.codigosBarra.length, 0));
}

function buildEntryResult(workbook, rows, formato, month, year, detailed, originalLines = rows.length, duplicates = 0, barcodeCount = 0) {
  const warnings = [];
  const dateIndex = columnIndex(workbook.headers, 'data');
  if (dateIndex >= 0) {
    const check = periodCheck(workbook.rows, dateIndex, month, year);
    if (check.message) warnings.push(check.message);
    if (check.severity === 'error') throw new Error(check.message);
  }
  return {
    tipo: 'entradas', formato, headers: workbook.originalHeaders, totalLinhas: originalLines, entradasUnicas: rows.length, produtos: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)).size,
    documentos: new Set(rows.map((row) => row.documento).filter(Boolean)).size, fornecedores: new Set(rows.map((row) => row.codigoFornecedor || row.fornecedor).filter(Boolean)).size, quantidadeTotal: rows.reduce((sum, row) => sum + (row.quantidade || 0), 0), duplicidadesPorCodigoBarra: detailed ? duplicates : 0,
    codigosBarras: barcodeCount, warnings, produtosSet: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)), linhas: rows, preview: rows.slice(0, 20), detailed,
  };
}

function salesPreview(workbook, month, year) {
  const codeIndex = columnIndex(workbook.headers, 'codigoExterno');
  if (hasAny(workbook.headers, HEADER_ALIASES.qsm1) || hasAny(workbook.headers, HEADER_ALIASES.vsm1)) throw new Error('Relatório qsm/vsm não é fonte oficial de vendas; envie o relatório detalhado de vendas.');
  const dateIndex = columnIndex(workbook.headers, 'data');
  const quantityIndex = columnIndex(workbook.headers, 'quantidade');
  if (codeIndex < 0 || dateIndex < 0 || quantityIndex < 0) throw new Error('Não foi possível identificar a estrutura detalhada do relatório de vendas.');
  const indexes = Object.fromEntries(Object.keys(HEADER_ALIASES).map((key) => [key, columnIndex(workbook.headers, key)]));
  const rows = workbook.rows.map((row, index) => ({
    linha: index + 2, codigoExterno: normalizeCode(row[indexes.codigoExterno]), nomeProduto: normalizeText(row[indexes.nomeProduto]), quantidade: parseNumber(row[indexes.quantidade]), total: parseNumber(row[indexes.total]), docTotal: parseNumber(row[indexes.docTotal]), desconto: parseNumber(row[indexes.desconto]), totalBruto: parseNumber(row[indexes.totalBruto]), documento: normalizeText(row[indexes.documento]), data: toIsoDate(row[indexes.data]), vendedor: normalizeText(row[indexes.vendedor]), caixa: normalizeText(row[indexes.caixa]), grupo: normalizeText(row[indexes.grupo]), subGrupo: normalizeText(row[indexes.subGrupo]),
  })).filter((row) => row.codigoExterno || row.documento);
  const warnings = [];
  const check = periodCheck(workbook.rows, dateIndex, month, year);
  if (check.message) warnings.push(check.message);
  if (check.severity === 'error') throw new Error(check.message);
  return {
    tipo: 'vendas', formato: 'vendas-detalhadas', headers: workbook.originalHeaders, totalLinhas: rows.length, produtos: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)).size, documentos: new Set(rows.map((row) => row.documento).filter(Boolean)).size, quantidadeTotal: rows.reduce((sum, row) => sum + (row.quantidade || 0), 0), periodoIdentificado: [...new Set(rows.map((row) => row.data).filter(Boolean))].sort(), warnings, produtosSet: new Set(rows.map((row) => row.codigoExterno).filter(Boolean)), linhas: rows, preview: rows.slice(0, 20),
  };
}

export function parseImportFile(buffer, filename, tipo, month, year) {
  const workbook = readWorkbook(buffer, filename);
  if (tipo === 'estoque') return stockPreview(workbook, month, year);
  if (tipo === 'entradas') return parseEntries(workbook, month, year);
  if (tipo === 'vendas') return salesPreview(workbook, month, year);
  throw new Error(`Tipo de relatório inválido: ${tipo}.`);
}
