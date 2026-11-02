import { notFound } from '../utils/apiError.js';
import { prisma } from '../lib/prisma.js';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function key(month, year) { return `${year}-${String(month).padStart(2, '0')}`; }
function periodLabel(period) { return `${String(period.mes).padStart(2, '0')}/${period.ano}`; }
function numeric(value) { return value === null || value === undefined ? 0 : Number(value); }
function periodRange(period) { const start = new Date(Date.UTC(period.ano, period.mes - 1, 1)); const end = new Date(Date.UTC(period.ano, period.mes, 1)); return { gte: start, lt: end }; }
function variation(current, previous) { if (previous === 0) return null; return Number((((current - previous) / previous) * 100).toFixed(2)); }
function trend(current, previous) { if (current === 0) return 'SEM_DEMANDA'; if (previous === 0) return 'NOVA_DEMANDA'; if (current > previous) return 'AUMENTO'; if (current < previous) return 'QUEDA'; return 'ESTAVEL'; }
function parsePeriod(query) {
  if (query.mes === undefined && query.ano === undefined) return null;
  const mes = Number(query.mes); const ano = Number(query.ano);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) { const error = new Error('Mês e ano do período são inválidos.'); error.status = 400; error.code = 'INVALID_PERIOD'; throw error; }
  return { mes, ano };
}

async function getPeriods() {
  const [sales, entries, snapshots] = await Promise.all([
    prisma.historicoVenda.groupBy({ by: ['mesReferencia', 'anoReferencia'] }),
    prisma.entradaMensal.groupBy({ by: ['mesReferencia', 'anoReferencia'] }),
    prisma.estoqueSnapshot.findMany({ distinct: ['dataReferencia'], select: { dataReferencia: true } }),
  ]);
  const map = new Map();
  for (const item of [...sales, ...entries]) map.set(key(item.mesReferencia, item.anoReferencia), { mes: item.mesReferencia, ano: item.anoReferencia });
  for (const item of snapshots) { const date = new Date(item.dataReferencia); const period = { mes: date.getUTCMonth() + 1, ano: date.getUTCFullYear() }; map.set(key(period.mes, period.ano), period); }
  return [...map.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

function productWhere(filters, ids) {
  const where = { id: { in: ids } };
  if (filters.grupo) where.grupo = filters.grupo;
  if (filters.subGrupo) where.subGrupo = filters.subGrupo;
  if (filters.search) where.OR = [{ nome: { contains: filters.search, mode: 'insensitive' } }, { codigoExterno: { contains: filters.search, mode: 'insensitive' } }];
  return where;
}

function snapshotMap(rows) { const map = new Map(); for (const row of rows) { const current = map.get(row.produtoId); if (!current || new Date(row.dataReferencia) > new Date(current.dataReferencia)) map.set(row.produtoId, row); } return map; }

async function loadPeriodData(period, productIds = null) {
  const where = { mesReferencia: period.mes, anoReferencia: period.ano, ...(productIds ? { produtoId: { in: productIds } } : {}) };
  const snapshotWhere = { dataReferencia: periodRange(period), ...(productIds ? { produtoId: { in: productIds } } : {}) };
  const [sales, entries, snapshots] = await Promise.all([
    prisma.historicoVenda.findMany({ where, select: { produtoId: true, quantidadeVendida: true } }),
    prisma.entradaMensal.findMany({ where, select: { produtoId: true, quantidadeEntrada: true, valorEntrada: true } }),
    prisma.estoqueSnapshot.findMany({ where: snapshotWhere, select: { produtoId: true, dataReferencia: true, quantidade: true } }),
  ]);
  return { sales, entries, snapshots };
}

export async function listarHistorico(query = {}) {
  const periods = await getPeriods();
  if (!periods.length) return { periodo: null, periodosDisponiveis: [], resumo: { produtosVendidos: 0, quantidadeVendida: 0, aumentaram: 0, diminuiram: 0, semVenda: 0 }, items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  const requested = parsePeriod(query); const currentIndex = requested ? periods.findIndex((item) => item.mes === requested.mes && item.ano === requested.ano) : periods.length - 1; const current = currentIndex >= 0 ? periods[currentIndex] : requested;
  if (currentIndex < 0) throw notFound('HISTORY_PERIOD_NOT_FOUND', `Não há histórico disponível para o período ${periodLabel(current)}.`);
  const previous = currentIndex > 0 ? periods[currentIndex - 1] : null;
  const currentData = await loadPeriodData(current);
  const previousData = previous ? await loadPeriodData(previous) : { sales: [], entries: [], snapshots: [] };
  const currentIds = new Set([...currentData.sales, ...currentData.entries, ...currentData.snapshots].map((item) => item.produtoId));
  const products = await prisma.produto.findMany({ where: productWhere(query, [...currentIds]), select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true, tipo: true } });
  const productIds = new Set(products.map((product) => product.id));
  const salesCurrent = new Map(currentData.sales.filter((item) => productIds.has(item.produtoId)).map((item) => [item.produtoId, item.quantidadeVendida]));
  const salesPrevious = new Map(previousData.sales.map((item) => [item.produtoId, item.quantidadeVendida]));
  const entriesCurrent = new Map(currentData.entries.map((item) => [item.produtoId, item]));
  const stocksCurrent = snapshotMap(currentData.snapshots);
  const rows = products.map((product) => {
    const atual = salesCurrent.get(product.id) || 0; const anterior = salesPrevious.get(product.id) || 0; const entry = entriesCurrent.get(product.id); const stock = stocksCurrent.get(product.id);
    return { produto: product, quantidadeVendida: atual, quantidadeMesAnterior: previous ? anterior : null, variacaoPercentual: previous ? variation(atual, anterior) : null, entrada: entry ? entry.quantidadeEntrada : 0, valorEntrada: entry ? entry.valorEntrada : null, estoqueFinal: stock?.quantidade ?? null, tendencia: previous ? trend(atual, anterior) : null };
  });
  const filtered = rows.filter((row) => {
    if (!query.tendencia) return true;
    if (query.tendencia === 'COM_VENDA') return row.quantidadeVendida > 0;
    if (query.tendencia === 'SEM_VENDA') return row.quantidadeVendida === 0;
    return row.tendencia === query.tendencia;
  });
  const sort = query.sort || 'maiorVenda';
  filtered.sort((a, b) => {
    if (sort === 'nome') return a.produto.nome.localeCompare(b.produto.nome, 'pt-BR');
    if (sort === 'menorVenda') return a.quantidadeVendida - b.quantidadeVendida || a.produto.nome.localeCompare(b.produto.nome, 'pt-BR');
    if (sort === 'maiorCrescimento') return (b.variacaoPercentual ?? -Infinity) - (a.variacaoPercentual ?? -Infinity);
    if (sort === 'maiorQueda') return (a.variacaoPercentual ?? Infinity) - (b.variacaoPercentual ?? Infinity);
    return b.quantidadeVendida - a.quantidadeVendida || a.produto.nome.localeCompare(b.produto.nome, 'pt-BR');
  });
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); const total = filtered.length;
  const growth = [...rows].filter((row) => row.tendencia === 'AUMENTO' || row.tendencia === 'NOVA_DEMANDA').sort((a, b) => (b.variacaoPercentual ?? -Infinity) - (a.variacaoPercentual ?? -Infinity)).slice(0, 5);
  const decline = [...rows].filter((row) => row.tendencia === 'QUEDA').sort((a, b) => (a.variacaoPercentual ?? Infinity) - (b.variacaoPercentual ?? Infinity)).slice(0, 5);
  return { periodo: { ...current, label: periodLabel(current) }, periodoAnterior: previous ? { ...previous, label: periodLabel(previous) } : null, periodosDisponiveis: periods.map((item) => ({ ...item, label: periodLabel(item) })), historicoDisponivel: periods.length, facets: { grupos: [...new Set(rows.map((row) => row.produto.grupo).filter(Boolean))].sort(), subGrupos: [...new Set(rows.map((row) => row.produto.subGrupo).filter(Boolean))].sort() }, resumo: { produtosVendidos: rows.filter((row) => row.quantidadeVendida > 0).length, quantidadeVendida: rows.reduce((totalValue, row) => totalValue + row.quantidadeVendida, 0), aumentaram: rows.filter((row) => row.tendencia === 'AUMENTO' || row.tendencia === 'NOVA_DEMANDA').length, diminuiram: rows.filter((row) => row.tendencia === 'QUEDA').length, semVenda: rows.filter((row) => row.quantidadeVendida === 0).length }, destaques: { crescimento: growth, queda: decline }, items: filtered.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 } };
}

export async function obterHistoricoProduto(id, query = {}) {
  const product = await prisma.produto.findUnique({ where: { id }, select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true, tipo: true } });
  if (!product) return null;
  const periods = await getPeriods(); if (!periods.length) return { produto: product, periodoSelecionado: null, historico: [], vendasDetalhadas: [] }; const requested = parsePeriod(query); const current = requested ? periods.find((item) => item.mes === requested.mes && item.ano === requested.ano) || requested : periods[periods.length - 1];
  const [sales, entries, snapshots] = await Promise.all([
    prisma.historicoVenda.findMany({ where: { produtoId: id }, select: { mesReferencia: true, anoReferencia: true, quantidadeVendida: true } }),
    prisma.entradaMensal.findMany({ where: { produtoId: id }, select: { mesReferencia: true, anoReferencia: true, quantidadeEntrada: true, valorEntrada: true } }),
    prisma.estoqueSnapshot.findMany({ where: { produtoId: id }, select: { dataReferencia: true, quantidade: true } }),
  ]);
  const salesMap = new Map(sales.map((item) => [key(item.mesReferencia, item.anoReferencia), item])); const entryMap = new Map(entries.map((item) => [key(item.mesReferencia, item.anoReferencia), item])); const stockMap = new Map();
  for (const item of snapshots) { const date = new Date(item.dataReferencia); const periodKey = key(date.getUTCMonth() + 1, date.getUTCFullYear()); const currentStock = stockMap.get(periodKey); if (!currentStock || new Date(item.dataReferencia) > new Date(currentStock.dataReferencia)) stockMap.set(periodKey, item); }
  const timeline = periods.map((period) => ({ ...period, label: periodLabel(period), vendas: salesMap.get(key(period.mes, period.ano))?.quantidadeVendida || 0, entradas: entryMap.get(key(period.mes, period.ano))?.quantidadeEntrada || 0, valorEntrada: entryMap.get(key(period.mes, period.ano))?.valorEntrada ?? null, estoqueFinal: stockMap.get(key(period.mes, period.ano))?.quantidade ?? null }));
  const detailPeriod = current || periods[periods.length - 1]; const salesDetails = detailPeriod ? await prisma.venda.findMany({ where: { data: periodRange(detailPeriod), itens: { some: { produtoId: id } } }, orderBy: { data: 'asc' }, select: { id: true, data: true, documento: true, itens: { where: { produtoId: id }, select: { quantidade: true } } } }) : [];
  return { produto: product, periodoSelecionado: detailPeriod ? { ...detailPeriod, label: periodLabel(detailPeriod) } : null, historico: timeline, vendasDetalhadas: salesDetails.map((item) => ({ id: item.id, data: item.data, documento: item.documento, quantidade: item.itens.reduce((total, line) => total + line.quantidade, 0) })) };
}
