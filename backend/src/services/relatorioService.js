import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/apiError.js';

const RISK_ORDER = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO', 'SEM_DEMANDA', 'DADO_ANOMALO'];
const TYPES = ['vendas', 'entradas', 'estoque', 'reposicao'];
const number = (value) => value === null || value === undefined ? 0 : Number(value);
const decimal = (value) => value === null || value === undefined ? null : new Prisma.Decimal(value).toString();
const key = (mes, ano) => `${ano}-${String(mes).padStart(2, '0')}`;
const label = (mes, ano) => `${String(mes).padStart(2, '0')}/${ano}`;
const periodRange = ({ mes, ano }) => ({ gte: new Date(Date.UTC(ano, mes - 1, 1)), lt: new Date(Date.UTC(ano, mes, 1)) });

function parsePeriod(query) {
  if (query.mes === undefined && query.ano === undefined) return null;
  const mes = Number(query.mes); const ano = Number(query.ano);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) { const error = new Error('Mês e ano do período são inválidos.'); error.status = 400; error.code = 'INVALID_PERIOD'; throw error; }
  return { mes, ano };
}

async function getPeriods() {
  const [sales, entries, snapshots, reports] = await Promise.all([
    prisma.historicoVenda.findMany({ distinct: ['mesReferencia', 'anoReferencia'], select: { mesReferencia: true, anoReferencia: true } }),
    prisma.entradaMensal.findMany({ distinct: ['mesReferencia', 'anoReferencia'], select: { mesReferencia: true, anoReferencia: true } }),
    prisma.estoqueSnapshot.findMany({ distinct: ['dataReferencia'], select: { dataReferencia: true } }),
    prisma.relatorioReposicao.findMany({ select: { periodoReferencia: true } }),
  ]);
  const map = new Map();
  for (const row of [...sales, ...entries]) map.set(key(row.mesReferencia, row.anoReferencia), { mes: row.mesReferencia, ano: row.anoReferencia });
  for (const row of snapshots) { const date = new Date(row.dataReferencia); const period = { mes: date.getUTCMonth() + 1, ano: date.getUTCFullYear() }; map.set(key(period.mes, period.ano), period); }
  for (const row of reports) { const [mes, ano] = row.periodoReferencia.split('/').map(Number); if (mes && ano) map.set(key(mes, ano), { mes, ano }); }
  return [...map.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

async function resolvePeriod(query) {
  const periods = await getPeriods();
  if (!periods.length) return { periods, current: null, previous: null };
  const requested = parsePeriod(query); const index = requested ? periods.findIndex((item) => item.mes === requested.mes && item.ano === requested.ano) : periods.length - 1;
  if (index < 0) throw notFound('REPORT_PERIOD_NOT_FOUND', `Não há dados disponíveis para o período ${label(requested.mes, requested.ano)}.`);
  return { periods, current: periods[index], previous: index > 0 ? periods[index - 1] : null };
}

function productWhere(query, ids) {
  const where = ids ? { id: { in: ids } } : {};
  if (query.grupo) where.grupo = query.grupo;
  if (query.subGrupo) where.subGrupo = query.subGrupo;
  if (query.search) where.OR = [{ nome: { contains: query.search, mode: 'insensitive' } }, { codigoExterno: { contains: query.search, mode: 'insensitive' } }];
  return where;
}

function paginate(rows, query) { const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); return { data: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: rows.length, totalPages: rows.length ? Math.ceil(rows.length / limit) : 0 } }; }
function facets(rows) { return { grupos: [...new Set(rows.map((row) => row.produto?.grupo).filter(Boolean))].sort(), subGrupos: [...new Set(rows.map((row) => row.produto?.subGrupo).filter(Boolean))].sort() }; }
function variation(current, previous) { return previous === null || previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(2)); }
function buildResult(tipo, current, previous, rows, resumo, query) { const page = query.export ? { data: rows, pagination: { page: 1, limit: rows.length, total: rows.length, totalPages: rows.length ? 1 : 0 } } : paginate(rows, query); return { tipo, periodo: { ...current, label: label(current.mes, current.ano) }, periodoAnterior: previous ? { ...previous, label: label(previous.mes, previous.ano) } : null, periodosDisponiveis: query.periods, resumo, facets: facets(rows), items: page.data, pagination: page.pagination }; }

async function reportSales(current, previous, query) {
  const [currentRows, previousRows] = await Promise.all([
    prisma.historicoVenda.findMany({ where: { mesReferencia: current.mes, anoReferencia: current.ano }, select: { produtoId: true, quantidadeVendida: true } }),
    previous ? prisma.historicoVenda.findMany({ where: { mesReferencia: previous.mes, anoReferencia: previous.ano }, select: { produtoId: true, quantidadeVendida: true } }) : [],
  ]);
  const products = await prisma.produto.findMany({ where: productWhere(query, currentRows.map((row) => row.produtoId)), select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true } });
  const currentMap = new Map(currentRows.map((row) => [row.produtoId, row.quantidadeVendida])); const previousMap = new Map(previousRows.map((row) => [row.produtoId, row.quantidadeVendida]));
  const rows = products.map((produto) => { const quantidade = currentMap.get(produto.id) || 0; const anterior = previous ? (previousMap.get(produto.id) || 0) : null; return { produto, quantidadeVendida: quantidade, quantidadeMesAnterior: anterior, variacaoPercentual: variation(quantidade, anterior) }; }).sort((a, b) => b.quantidadeVendida - a.quantidadeVendida || a.produto.nome.localeCompare(b.produto.nome, 'pt-BR'));
  return buildResult('vendas', current, previous, rows, { produtos: rows.length, quantidade: rows.reduce((sum, row) => sum + row.quantidadeVendida, 0), maiorDemanda: rows[0]?.quantidadeVendida || 0, menorDemanda: rows.length ? rows[rows.length - 1].quantidadeVendida : 0 }, query);
}

async function reportEntries(current, previous, query) {
  const rows = await prisma.entradaMensal.findMany({ where: { mesReferencia: current.mes, anoReferencia: current.ano }, include: { produto: { select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true } } } });
  const filtered = rows.filter((row) => { const p = row.produto; return (!query.grupo || p.grupo === query.grupo) && (!query.subGrupo || p.subGrupo === query.subGrupo) && (!query.search || p.nome.toLowerCase().includes(query.search.toLowerCase()) || p.codigoExterno.toLowerCase().includes(query.search.toLowerCase())); }).map((row) => ({ produto: row.produto, quantidadeEntrada: row.quantidadeEntrada, valorEntrada: decimal(row.valorEntrada), periodo: label(current.mes, current.ano) })).sort((a, b) => b.quantidadeEntrada - a.quantidadeEntrada || Number(b.valorEntrada) - Number(a.valorEntrada));
  return buildResult('entradas', current, previous, filtered, { produtos: filtered.length, quantidade: filtered.reduce((sum, row) => sum + row.quantidadeEntrada, 0), valor: filtered.reduce((sum, row) => sum.plus(new Prisma.Decimal(row.valorEntrada || 0)), new Prisma.Decimal(0)).toString(), maiorQuantidade: filtered[0]?.quantidadeEntrada || 0 }, query);
}

async function reportStock(current, previous, query) {
  const snapshots = await prisma.estoqueSnapshot.findMany({ where: { dataReferencia: periodRange(current) }, include: { produto: { select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true } } } });
  const latest = new Map(); for (const row of snapshots) { const old = latest.get(row.produtoId); if (!old || row.dataReferencia > old.dataReferencia) latest.set(row.produtoId, row); }
  const rows = [...latest.values()].filter((row) => { const p = row.produto; return (!query.grupo || p.grupo === query.grupo) && (!query.subGrupo || p.subGrupo === query.subGrupo) && (!query.search || p.nome.toLowerCase().includes(query.search.toLowerCase()) || p.codigoExterno.toLowerCase().includes(query.search.toLowerCase())); }).map((row) => ({ produto: row.produto, quantidade: decimal(row.quantidade), dataReferencia: row.dataReferencia, anomalo: new Prisma.Decimal(row.quantidade).abs().gt(1000000) })).sort((a, b) => Number(b.quantidade) - Number(a.quantidade));
  return buildResult('estoque', current, previous, rows, { produtos: rows.length, positivos: rows.filter((row) => Number(row.quantidade) > 0).length, zerados: rows.filter((row) => Number(row.quantidade) === 0).length, negativos: rows.filter((row) => Number(row.quantidade) < 0).length, anomalos: rows.filter((row) => row.anomalo).length }, query);
}

async function reportReplenishment(current, previous, query) {
  const where = { mesReferencia: current.mes, anoReferencia: current.ano, ...(query.risco ? { risco: query.risco } : {}), ...(query.confianca ? { confianca: query.confianca } : {}) };
  const rows = await prisma.calculoReposicao.findMany({ where, include: { produto: { select: { id: true, nome: true, codigoExterno: true, grupo: true, subGrupo: true } } } });
  const filtered = rows.filter((row) => { const p = row.produto; return (!query.grupo || p.grupo === query.grupo) && (!query.subGrupo || p.subGrupo === query.subGrupo) && (!query.search || p.nome.toLowerCase().includes(query.search.toLowerCase()) || p.codigoExterno.toLowerCase().includes(query.search.toLowerCase())); }).map((row) => ({ produto: row.produto, demandaMedia: decimal(row.demandaMedia), estoqueAtual: decimal(row.estoqueAtual), coberturaDias: decimal(row.coberturaDias), risco: row.risco, confianca: row.confianca, quantidadeSugerida: row.quantidadeRecomendada, historicoInsuficiente: row.historicoInsuficiente })).sort((a, b) => RISK_ORDER.indexOf(a.risco) - RISK_ORDER.indexOf(b.risco) || Number(a.coberturaDias ?? Infinity) - Number(b.coberturaDias ?? Infinity) || b.quantidadeSugerida - a.quantidadeSugerida);
  const suggestions = await prisma.sugestaoCompra.findMany({ where: { calculo: { mesReferencia: current.mes, anoReferencia: current.ano } }, select: { quantidadeSugerida: true } });
  const counts = Object.fromEntries(RISK_ORDER.map((risk) => [risk, filtered.filter((row) => row.risco === risk).length]));
  return buildResult('reposicao', current, previous, filtered, { possuiCalculo: rows.length > 0, calculos: filtered.length, sugestoes: suggestions.length, quantidadeSugerida: suggestions.reduce((sum, row) => sum + row.quantidadeSugerida, 0), ...counts, historicoInsuficiente: filtered.filter((row) => row.historicoInsuficiente).length }, query);
}

export async function listarRelatorio(query = {}) {
  const tipo = query.tipo || 'vendas'; if (!TYPES.includes(tipo)) { const error = new Error('Tipo de relatório inválido.'); error.status = 400; error.code = 'INVALID_REPORT_TYPE'; throw error; }
  const resolved = await resolvePeriod(query); if (!resolved.current) return { tipo, periodo: null, periodosDisponiveis: [], resumo: {}, items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  const options = { ...query, periods: resolved.periods.map((item) => ({ ...item, label: label(item.mes, item.ano) })) };
  if (tipo === 'vendas') return reportSales(resolved.current, resolved.previous, options);
  if (tipo === 'entradas') return reportEntries(resolved.current, resolved.previous, options);
  if (tipo === 'estoque') return reportStock(resolved.current, resolved.previous, options);
  return reportReplenishment(resolved.current, resolved.previous, options);
}

function csvValue(value) { const text = value === null || value === undefined ? '' : String(value); return `"${text.replaceAll('"', '""')}"`; }
export function toCsv(report) {
  const headers = report.tipo === 'vendas' ? ['Produto', 'Código', 'Grupo', 'Subgrupo', 'Quantidade vendida', 'Mês anterior', 'Variação (%)'] : report.tipo === 'entradas' ? ['Produto', 'Código', 'Grupo', 'Subgrupo', 'Quantidade recebida', 'Valor total', 'Período'] : report.tipo === 'estoque' ? ['Produto', 'Código', 'Grupo', 'Subgrupo', 'Quantidade', 'Data de referência'] : ['Produto', 'Código', 'Grupo', 'Subgrupo', 'Demanda média', 'Estoque', 'Cobertura (dias)', 'Risco', 'Confiança', 'Quantidade sugerida'];
  const lines = report.items.map((row) => { const p = row.produto; const values = report.tipo === 'vendas' ? [p.nome, p.codigoExterno, p.grupo, p.subGrupo, row.quantidadeVendida, row.quantidadeMesAnterior, row.variacaoPercentual] : report.tipo === 'entradas' ? [p.nome, p.codigoExterno, p.grupo, p.subGrupo, row.quantidadeEntrada, row.valorEntrada, row.periodo] : report.tipo === 'estoque' ? [p.nome, p.codigoExterno, p.grupo, p.subGrupo, row.quantidade, new Date(row.dataReferencia).toLocaleDateString('pt-BR')] : [p.nome, p.codigoExterno, p.grupo, p.subGrupo, row.demandaMedia, row.estoqueAtual, row.coberturaDias, row.risco, row.confianca, row.quantidadeSugerida]; return values.map(csvValue).join(';'); });
  return `\uFEFF${[headers.map(csvValue).join(';'), ...lines].join('\r\n')}\r\n`;
}
