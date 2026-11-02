import { notFound } from '../utils/apiError.js';
import { prisma } from '../lib/prisma.js';

const RISK_ORDER = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO', 'SEM_DEMANDA', 'DADO_ANOMALO'];

function key(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function label(month, year) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

function periodFromSnapshot(date) {
  const value = new Date(date);
  return { mes: value.getUTCMonth() + 1, ano: value.getUTCFullYear() };
}

function numeric(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function variation(current, previous) {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function parseRequestedPeriod(query) {
  if (query.mes === undefined && query.ano === undefined) return null;
  const mes = Number(query.mes);
  const ano = Number(query.ano);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    const error = new Error('Mês e ano do período são inválidos.');
    error.status = 400;
    error.code = 'INVALID_PERIOD';
    throw error;
  }
  return { mes, ano };
}

async function availablePeriods() {
  const [sales, entries, snapshots] = await Promise.all([
    prisma.historicoVenda.groupBy({ by: ['mesReferencia', 'anoReferencia'], _sum: { quantidadeVendida: true } }),
    prisma.entradaMensal.groupBy({ by: ['mesReferencia', 'anoReferencia'], _sum: { quantidadeEntrada: true } }),
    prisma.estoqueSnapshot.findMany({ distinct: ['dataReferencia'], select: { dataReferencia: true } }),
  ]);
  const periods = new Map();
  for (const item of sales) periods.set(key(item.mesReferencia, item.anoReferencia), { mes: item.mesReferencia, ano: item.anoReferencia, vendas: numeric(item._sum.quantidadeVendida), entradas: 0 });
  for (const item of entries) {
    const periodKey = key(item.mesReferencia, item.anoReferencia);
    const current = periods.get(periodKey) || { mes: item.mesReferencia, ano: item.anoReferencia, vendas: 0, entradas: 0 };
    current.entradas = numeric(item._sum.quantidadeEntrada);
    periods.set(periodKey, current);
  }
  for (const item of snapshots) {
    const period = periodFromSnapshot(item.dataReferencia);
    const periodKey = key(period.mes, period.ano);
    if (!periods.has(periodKey)) periods.set(periodKey, { ...period, vendas: 0, entradas: 0 });
  }
  return [...periods.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

function periodWhere(period) {
  return { mesReferencia: period.mes, anoReferencia: period.ano };
}

export async function getDashboard(query = {}) {
  const periods = await availablePeriods();
  if (!periods.length) return { periodo: null, periodosDisponiveis: [], historicoDisponivel: 0, semDados: true };

  const requested = parseRequestedPeriod(query);
  const currentIndex = requested ? periods.findIndex((period) => period.mes === requested.mes && period.ano === requested.ano) : periods.length - 1;
  const current = currentIndex >= 0 ? periods[currentIndex] : requested;
  if (currentIndex < 0) throw notFound('DASHBOARD_PERIOD_NOT_FOUND', `Não há dados disponíveis para o período ${label(current.mes, current.ano)}.`);
  const previous = currentIndex > 0 ? periods[currentIndex - 1] : null;
  const currentWhere = periodWhere(current);
  const previousWhere = previous ? periodWhere(previous) : null;
  const periodoReferencia = label(current.mes, current.ano);

  const [salesCurrent, salesPrevious, entriesCurrent, entriesPrevious, stockCounts, calculations, report, topProducts, criticalProducts] = await Promise.all([
    prisma.historicoVenda.aggregate({ where: currentWhere, _sum: { quantidadeVendida: true } }),
    previous ? prisma.historicoVenda.aggregate({ where: previousWhere, _sum: { quantidadeVendida: true } }) : Promise.resolve({ _sum: { quantidadeVendida: null } }),
    prisma.entradaMensal.aggregate({ where: currentWhere, _sum: { quantidadeEntrada: true } }),
    previous ? prisma.entradaMensal.aggregate({ where: previousWhere, _sum: { quantidadeEntrada: true } }) : Promise.resolve({ _sum: { quantidadeEntrada: null } }),
    Promise.all([
      prisma.estoque.count(),
      prisma.estoque.count({ where: { quantidadeAtual: { gt: 0 } } }),
      prisma.estoque.count({ where: { quantidadeAtual: 0 } }),
      prisma.estoque.count({ where: { quantidadeAtual: { lt: 0 } } }),
    ]),
    prisma.calculoReposicao.findMany({ where: currentWhere, select: { risco: true, historicoInsuficiente: true, estoqueAtual: true, warnings: true } }),
    prisma.relatorioReposicao.findUnique({ where: { periodoReferencia }, select: { id: true, sugestoes: { select: { sugestao: { select: { quantidadeSugerida: true } } } } } }),
    prisma.historicoVenda.findMany({ where: currentWhere, orderBy: { quantidadeVendida: 'desc' }, take: 10, select: { quantidadeVendida: true, produto: { select: { nome: true, codigoExterno: true, estoque: { select: { quantidadeAtual: true } } } } } }),
    prisma.calculoReposicao.findMany({ where: { ...currentWhere, risco: 'CRITICO' }, orderBy: [{ coberturaDias: 'asc' }, { quantidadeRecomendada: 'desc' }], take: 10, select: { coberturaDias: true, demandaMedia: true, quantidadeRecomendada: true, estoqueAtual: true, produto: { select: { nome: true, codigoExterno: true } }, sugestoes: { select: { id: true, quantidadeSugerida: true }, take: 1 } } }),
  ]);

  const risks = Object.fromEntries(RISK_ORDER.map((risk) => [risk, 0]));
  let historicoInsuficiente = 0;
  let dadosAnomalos = 0;
  for (const calculation of calculations) {
    risks[calculation.risco] += 1;
    if (calculation.historicoInsuficiente) historicoInsuficiente += 1;
    if (calculation.risco === 'DADO_ANOMALO' || (Array.isArray(calculation.warnings) && calculation.warnings.includes('DADO_ANOMALO'))) dadosAnomalos += 1;
  }
  const suggestions = report?.sugestoes || [];
  const quantidadeSugerida = suggestions.reduce((total, item) => total + item.sugestao.quantidadeSugerida, 0);
  const vendas = numeric(salesCurrent._sum.quantidadeVendida);
  const vendasAnterior = numeric(salesPrevious._sum.quantidadeVendida);
  const entradas = numeric(entriesCurrent._sum.quantidadeEntrada);
  const entradasAnterior = numeric(entriesPrevious._sum.quantidadeEntrada);

  return {
    periodo: { ...current, label: periodoReferencia },
    periodoAnterior: previous ? { ...previous, label: label(previous.mes, previous.ano) } : null,
    periodosDisponiveis: periods.map((period) => ({ ...period, label: label(period.mes, period.ano) })),
    historicoDisponivel: periods.length,
    vendas: { quantidade: vendas, variacaoPercentual: variation(vendas, vendasAnterior) },
    entradas: { quantidade: entradas, variacaoPercentual: variation(entradas, entradasAnterior) },
    estoque: { produtos: stockCounts[0], positivos: stockCounts[1], zerados: stockCounts[2], negativos: stockCounts[3] },
    reposicao: { possuiCalculo: Boolean(report), sugestoes: suggestions.length, quantidadeSugerida, criticos: risks.CRITICO, altos: risks.ALTO },
    riscos: risks,
    topProdutos: topProducts.map((item) => ({ produto: item.produto, quantidadeVendida: item.quantidadeVendida, estoqueAtual: item.produto.estoque?.quantidadeAtual ?? null })),
    produtosCriticos: criticalProducts.map((item) => ({ produto: item.produto, estoqueAtual: item.estoqueAtual, coberturaDias: item.coberturaDias, demandaMedia: item.demandaMedia, quantidadeSugerida: item.sugestoes[0]?.quantidadeSugerida ?? null, sugestaoId: item.sugestoes[0]?.id ?? null })),
    qualidadeDados: { dadosAnomalos, historicoInsuficiente, estoqueNegativo: stockCounts[3] },
  };
}
