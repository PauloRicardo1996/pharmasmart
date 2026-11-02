import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { parseDate, parseImportFile } from '../utils/importacaoParser.js';
import { registrarAuditoria } from './auditoriaService.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function parsePeriod(month, year) {
  const parsedMonth = Number(month);
  const parsedYear = Number(year);
  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 || !Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    throw new ApiError(400, 'INVALID_PERIOD', 'Informe um mês e ano válidos para o período.');
  }
  return { month: parsedMonth, year: parsedYear };
}

function validateFile(file, label) {
  if (!file) throw new ApiError(400, 'MISSING_FILE', `Informe o relatório de ${label} para continuar.`);
  if (file.size > MAX_FILE_SIZE) throw new ApiError(400, 'FILE_TOO_LARGE', `O arquivo de ${label} excede o limite de 10 MB.`);
  const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!['.xls', '.xlsx', '.csv'].includes(extension)) throw new ApiError(400, 'INVALID_FILE_EXTENSION', `O arquivo de ${label} deve ser .xls, .xlsx ou .csv.`);
}

function parseReport(file, tipo, month, year) {
  try {
    return parseImportFile(file.buffer, file.originalname, tipo, month, year);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'INVALID_REPORT', error.message || `Não foi possível validar o relatório de ${tipo}.`);
  }
}

function prepareImportPackage({ files, month, year }) {
  const period = parsePeriod(month, year);
  const estoque = files?.estoque?.[0];
  const entradas = files?.entradas?.[0];
  const vendas = files?.vendas?.[0];
  validateFile(estoque, 'Estoque');
  validateFile(entradas, 'Entradas');
  validateFile(vendas, 'Vendas');
  const estoquePreview = parseReport(estoque, 'estoque', period.month, period.year);
  const entradasPreview = parseReport(entradas, 'entradas', period.month, period.year);
  const vendasPreview = parseReport(vendas, 'vendas', period.month, period.year);
  const stockProducts = estoquePreview.produtosSet;
  const entryProducts = entradasPreview.produtosSet;
  const salesProducts = vendasPreview.produtosSet;
  const allProducts = new Set([...stockProducts, ...entryProducts, ...salesProducts]);
  const intersection = [...allProducts].filter((code) => stockProducts.has(code) && entryProducts.has(code) && salesProducts.has(code));
  const salesWithoutStock = [...salesProducts].filter((code) => !stockProducts.has(code));
  const entriesWithoutStock = [...entryProducts].filter((code) => !stockProducts.has(code));
  const crossWarnings = [];
  if (salesWithoutStock.length) crossWarnings.push(`${salesWithoutStock.length} produto(s) presente(s) em vendas não foi(ram) encontrado(s) no estoque.`);
  if (entriesWithoutStock.length) crossWarnings.push(`${entriesWithoutStock.length} produto(s) presente(s) em entradas não foi(ram) encontrado(s) no estoque.`);
  const warnings = [
    ...estoquePreview.warnings.map((message) => ({ tipo: 'estoque', message })),
    ...entradasPreview.warnings.map((message) => ({ tipo: 'entradas', message })),
    ...vendasPreview.warnings.map((message) => ({ tipo: 'vendas', message })),
    ...crossWarnings.map((message) => ({ tipo: 'cruzamento', message })),
  ];
  return {
    period, files: { estoque, entradas, vendas }, estoquePreview, entradasPreview, vendasPreview, warnings,
    cross: { produtosEstoque: stockProducts.size, produtosEntradas: entryProducts.size, produtosVendas: salesProducts.size, encontradosNosTres: intersection.length, vendasAusentesNoEstoque: salesWithoutStock.length, entradasAusentesNoEstoque: entriesWithoutStock.length },
  };
}

function publicPreview(prepared) {
  const { estoquePreview, entradasPreview, vendasPreview, period, files, warnings, cross } = prepared;
  const { produtosSet: _stock, linhas: _stockRows, dataReferencia: _referenceDate, ...estoque } = estoquePreview;
  const { produtosSet: _entries, linhas: _entryRows, ...entradas } = entradasPreview;
  const { produtosSet: _sales, linhas: _salesRows, ...vendas } = vendasPreview;
  return {
    periodo: period,
    status: 'PREPARADO_PARA_IMPORTACAO',
    arquivos: { estoque: files.estoque.originalname, entradas: files.entradas.originalname, vendas: files.vendas.originalname },
    estoque, entradas, vendas, cruzamento: cross, warnings, persistido: false,
  };
}

export function validateImportPackage(input) {
  return publicPreview(prepareImportPackage(input));
}

function decimal(value) {
  return value === null || value === undefined || value === '' ? null : new Prisma.Decimal(String(value));
}

function integer(value, label) {
  if (value === null || value === undefined || value === '') return 0;
  if (!Number.isInteger(value)) throw new ApiError(400, 'INVALID_QUANTITY', `${label} deve ser uma quantidade inteira.`);
  return value;
}

export function decimalQuantity(value, label = 'Quantidade') {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal('0');
  const parsed = new Prisma.Decimal(String(value));
  if (!parsed.isFinite()) throw new ApiError(400, 'INVALID_QUANTITY', `${label} deve ser uma quantidade num?rica.`);
  return parsed;
}

function firstNonEmpty(...values) { return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || ''; }

function inferTipo(product) {
  const text = [product.subGrupo, product.grupo, product.nome].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/\bGENERICO\b/.test(text)) return 'GENERICO';
  if (/\bSIMILAR\b/.test(text)) return 'SIMILAR';
  if (/\bMARCA\b/.test(text)) return 'MARCA';
  return null;
}

export function resolveTipoProduto(product) {
  return inferTipo(product) || 'NAO_CLASSIFICADO';
}

function consolidateProducts(prepared) {
  const map = new Map();
  const add = (row, source) => {
    if (!row.codigoExterno) return;
    const current = map.get(row.codigoExterno) || { codigoExterno: row.codigoExterno, sources: new Set() };
    current.sources.add(source);
    if (source === 'estoque') {
      current.nome = firstNonEmpty(current.nome, row.nomeProduto);
      current.custo = current.custo ?? row.custo;
      current.stockGroup = firstNonEmpty(current.stockGroup, row.grupo);
      current.stockSubGroup = firstNonEmpty(current.stockSubGroup, row.subGrupo);
    }
    if (source === 'entradas') current.nomeEntrada = firstNonEmpty(current.nomeEntrada, row.nomeProduto);
    if (source === 'vendas') {
      current.nomeVenda = firstNonEmpty(current.nomeVenda, row.nomeProduto);
      current.grupo = firstNonEmpty(current.grupo, row.grupo);
      current.subGrupo = firstNonEmpty(current.subGrupo, row.subGrupo);
    }
    map.set(row.codigoExterno, current);
  };
  prepared.estoquePreview.linhas.forEach((row) => add(row, 'estoque'));
  prepared.entradasPreview.linhas.forEach((row) => add(row, 'entradas'));
  prepared.vendasPreview.linhas.forEach((row) => add(row, 'vendas'));
  return [...map.values()].map((product) => ({
    ...product,
    nome: firstNonEmpty(product.nomeVenda, product.nome, product.nomeEntrada, `Produto ${product.codigoExterno}`),
    grupo: firstNonEmpty(product.grupo, product.stockGroup),
    subGrupo: firstNonEmpty(product.subGrupo, product.stockSubGroup),
  }));
}

function periodBounds(month, year) {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

async function assertPeriodNotImported(tx, month, year) {
  const { start, end } = periodBounds(month, year);
  const [snapshot, entry, history] = await Promise.all([
    tx.estoqueSnapshot.findFirst({ where: { dataReferencia: { gte: start, lt: end } }, select: { id: true } }),
    tx.entradaMensal.findFirst({ where: { mesReferencia: month, anoReferencia: year }, select: { id: true } }),
    tx.historicoVenda.findFirst({ where: { mesReferencia: month, anoReferencia: year }, select: { id: true } }),
  ]);
  if (snapshot || entry || history) throw new ApiError(409, 'PERIOD_ALREADY_IMPORTED', `O período ${String(month).padStart(2, '0')}/${year} já possui dados importados.`);
}

async function persistProducts(tx, prepared, warnings) {
  const products = consolidateProducts(prepared);
  const codes = products.map((product) => product.codigoExterno);
  const existing = await tx.produto.findMany({ where: { codigoExterno: { in: codes } } });
  const existingByCode = new Map(existing.map((product) => [product.codigoExterno, product]));
  const newProducts = products.filter((product) => !existingByCode.has(product.codigoExterno));
  const productsWithoutType = newProducts.filter((product) => !inferTipo(product));
  if (productsWithoutType.length) warnings.push({ tipo: 'produto', message: `${productsWithoutType.length} produto(s) sem evid?ncia segura de TipoProduto foram classificados como NAO_CLASSIFICADO.` });
  if (newProducts.length) {
    await tx.produto.createMany({ data: newProducts.map((product) => ({
      codigoExterno: product.codigoExterno,
      nome: product.nome,
      principioAtivo: 'Não informado',
      categoria: product.grupo || product.subGrupo || 'Não classificado',
      tipo: resolveTipoProduto(product),
      precoUnitario: decimal(product.custo) || new Prisma.Decimal('0'),
      grupo: product.grupo || null,
      subGrupo: product.subGrupo || null,
    })) });
  }
  let updated = 0;
  for (const product of products.filter((item) => existingByCode.has(item.codigoExterno))) {
    const current = existingByCode.get(product.codigoExterno);
    const data = {};
    if ((!current.grupo || !current.grupo.trim()) && product.grupo) data.grupo = product.grupo;
    if ((!current.subGrupo || !current.subGrupo.trim()) && product.subGrupo) data.subGrupo = product.subGrupo;
    if ((!current.nome || current.nome.startsWith('Produto ')) && product.nome) data.nome = product.nome;
    if (Object.keys(data).length) { await tx.produto.update({ where: { id: current.id }, data }); updated += 1; }
  }
  const all = await tx.produto.findMany({ where: { codigoExterno: { in: codes } }, select: { id: true, codigoExterno: true } });
  return { products, byCode: new Map(all.map((product) => [product.codigoExterno, product.id])), created: newProducts.length, updated };
}

async function persistStock(tx, prepared, productIds) {
  const rows = prepared.estoquePreview.linhas.filter((row) => row.codigoExterno && row.quantidade !== null);
  const ids = [...new Set(rows.map((row) => productIds.get(row.codigoExterno)).filter(Boolean))];
  const existing = await tx.estoque.findMany({ where: { produtoId: { in: ids } }, select: { produtoId: true } });
  const existingIds = new Set(existing.map((row) => row.produtoId));
  const creates = rows.filter((row) => !existingIds.has(productIds.get(row.codigoExterno))).map((row) => ({ produtoId: productIds.get(row.codigoExterno), quantidadeAtual: decimalQuantity(row.quantidade, 'Estoque'), quantidadeMinima: 0 }));
  if (creates.length) await tx.estoque.createMany({ data: creates });
  for (const row of rows.filter((item) => existingIds.has(productIds.get(item.codigoExterno)))) await tx.estoque.update({ where: { produtoId: productIds.get(row.codigoExterno) }, data: { quantidadeAtual: decimalQuantity(row.quantidade, 'Estoque') } });
  return rows.length;
}

async function persistSnapshots(tx, prepared, productIds) {
  if (!prepared.estoquePreview.dataReferencia) throw new ApiError(400, 'MISSING_STOCK_DATE', 'O relatório de estoque não possui uma data de fechamento válida.');
  const rows = prepared.estoquePreview.linhas.filter((row) => row.codigoExterno && row.quantidade !== null);
  const unique = new Map(rows.map((row) => [productIds.get(row.codigoExterno), row]));
  await tx.estoqueSnapshot.createMany({ data: [...unique.entries()].filter(([produtoId]) => produtoId).map(([produtoId, row]) => ({ produtoId, dataReferencia: prepared.estoquePreview.dataReferencia, quantidade: decimalQuantity(row.quantidade, 'Snapshot de estoque') })) });
  return unique.size;
}

async function persistMonthlyEntries(tx, prepared, productIds) {
  const grouped = new Map();
  for (const row of prepared.entradasPreview.linhas) {
    const produtoId = productIds.get(row.codigoExterno);
    if (!produtoId) continue;
    const current = grouped.get(produtoId) || { produtoId, quantidadeEntrada: 0, valorEntrada: 0 };
    current.quantidadeEntrada += integer(row.quantidade, 'Entrada mensal');
    current.valorEntrada += row.valor || 0;
    grouped.set(produtoId, current);
  }
  await tx.entradaMensal.createMany({ data: [...grouped.values()].map((row) => ({ produtoId: row.produtoId, mesReferencia: prepared.period.month, anoReferencia: prepared.period.year, quantidadeEntrada: row.quantidadeEntrada, valorEntrada: decimal(row.valorEntrada) || new Prisma.Decimal('0') })) });
  return grouped.size;
}

async function persistSales(tx, prepared, productIds) {
  const grouped = new Map();
  for (const row of prepared.vendasPreview.linhas) {
    const produtoId = productIds.get(row.codigoExterno);
    if (!produtoId) throw new ApiError(400, 'SALE_PRODUCT_NOT_FOUND', `Produto ${row.codigoExterno} da venda não pôde ser relacionado.`);
    if (!row.data) throw new ApiError(400, 'SALE_DATE_INVALID', 'Existe venda sem data válida.');
    const key = `${row.documento}|${row.data}|${row.caixa}`;
    const group = grouped.get(key) || { documento: row.documento || null, data: row.data, caixa: row.caixa || null, valorDocumento: row.docTotal, vendedor: row.vendedor || null, itens: [] };
    group.itens.push({ ...row, produtoId });
    if (group.valorDocumento === null || group.valorDocumento === undefined) group.valorDocumento = row.docTotal;
    grouped.set(key, group);
  }
  let itemCount = 0;
  const monthly = new Map();
  for (const group of grouped.values()) {
    const venda = await tx.venda.create({ data: { documento: group.documento, data: parseDate(group.data), valorDocumento: decimal(group.valorDocumento), vendedor: group.vendedor, caixa: group.caixa } });
    await tx.itemVenda.createMany({ data: group.itens.map((row) => { const produtoKey = row.codigoExterno; monthly.set(produtoKey, (monthly.get(produtoKey) || 0) + integer(row.quantidade, 'Venda')); return { vendaId: venda.id, produtoId: row.produtoId, quantidade: integer(row.quantidade, 'Venda'), valorLiquido: decimal(row.total) || new Prisma.Decimal('0'), valorBruto: decimal(row.totalBruto), desconto: decimal(row.desconto) }; }) });
    itemCount += group.itens.length;
  }
  await tx.historicoVenda.createMany({ data: [...monthly.entries()].map(([codigoExterno, quantidadeVendida]) => ({ produtoId: productIds.get(codigoExterno), mesReferencia: prepared.period.month, anoReferencia: prepared.period.year, quantidadeVendida })) });
  return { sales: grouped.size, items: itemCount, histories: monthly.size };
}

export async function confirmImportPackage(input, audit = {}) {
  const prepared = prepareImportPackage(input);
  const warnings = [...prepared.warnings];
  const summary = await prisma.$transaction(async (tx) => {
    await assertPeriodNotImported(tx, prepared.period.month, prepared.period.year);
    const products = await persistProducts(tx, prepared, warnings);
    const stock = await persistStock(tx, prepared, products.byCode);
    const snapshots = await persistSnapshots(tx, prepared, products.byCode);
    const entries = await persistMonthlyEntries(tx, prepared, products.byCode);
    const sales = await persistSales(tx, prepared, products.byCode);
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'IMPORTACAO', acao: 'IMPORTAR', descricao: `Importação do período ${String(prepared.period.month).padStart(2, '0')}/${prepared.period.year} concluída.`, dados: { periodo: `${String(prepared.period.month).padStart(2, '0')}/${prepared.period.year}`, produtos: products.products.length, snapshots, entradas, vendas: sales.sales, historicos: sales.histories } });
    return { produtosCriados: products.created, produtosAtualizados: products.updated, estoquesAtualizados: stock, snapshotsCriados: snapshots, entradasMensaisCriadas: entries, vendasCriadas: sales.sales, itensVendaCriados: sales.items, historicosCriados: sales.histories };
  }, { maxWait: 10000, timeout: 120000 });
  return { status: 'IMPORTADO', persistido: true, periodo: { mes: prepared.period.month, ano: prepared.period.year }, resumo: summary, warnings };
}

export { MAX_FILE_SIZE };
