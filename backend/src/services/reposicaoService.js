import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { registrarAuditoria } from './auditoriaService.js';
import { conflict } from '../utils/apiError.js';

export const REPOSICAO_DEFAULTS = Object.freeze({
  coberturaDesejadaDias: new Prisma.Decimal('30'),
  margemSegurancaPercentual: new Prisma.Decimal('20'),
  diasPorMes: new Prisma.Decimal('30'),
  limiteEstoqueAnomalo: new Prisma.Decimal('1000000'),
});

function decimal(value) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value ?? 0));
}

function outputDecimal(value) {
  return decimal(value).toString();
}

export function calcularDemandaMedia(quantidades, mesesConsiderados = quantidades.length) {
  const meses = Math.max(1, mesesConsiderados);
  return quantidades.reduce((total, value) => total.plus(decimal(value)), new Prisma.Decimal(0)).div(meses);
}

export function calcularDemandaDiaria(demandaMediaMensal) {
  return decimal(demandaMediaMensal).div(REPOSICAO_DEFAULTS.diasPorMes);
}

export function calcularCobertura(estoqueAtual, demandaMediaDiaria) {
  const estoque = decimal(estoqueAtual);
  const diaria = decimal(demandaMediaDiaria);
  if (diaria.lte(0)) return null;
  return estoque.lte(0) ? new Prisma.Decimal(0) : estoque.div(diaria);
}

export function calcularEstoqueSeguranca(demandaMediaMensal, coberturaDesejadaDias, margemSegurancaPercentual) {
  const demandaPeriodo = decimal(demandaMediaMensal).mul(decimal(coberturaDesejadaDias)).div(REPOSICAO_DEFAULTS.diasPorMes);
  return demandaPeriodo.mul(decimal(margemSegurancaPercentual)).div(100);
}

export function calcularEstoqueAlvo(demandaMediaMensal, coberturaDesejadaDias = REPOSICAO_DEFAULTS.coberturaDesejadaDias, margemSegurancaPercentual = REPOSICAO_DEFAULTS.margemSegurancaPercentual) {
  const demandaCobertura = decimal(demandaMediaMensal).mul(decimal(coberturaDesejadaDias)).div(REPOSICAO_DEFAULTS.diasPorMes);
  return demandaCobertura.plus(calcularEstoqueSeguranca(demandaMediaMensal, coberturaDesejadaDias, margemSegurancaPercentual));
}

export function calcularQuantidadeSugerida(estoqueAlvo, estoqueAtual) {
  const necessidade = decimal(estoqueAlvo).minus(decimal(estoqueAtual));
  return necessidade.lte(0) ? new Prisma.Decimal(0) : necessidade;
}

export function classificarRisco({ estoqueAtual, coberturaDias, demandaMediaMensal, coberturaDesejadaDias = REPOSICAO_DEFAULTS.coberturaDesejadaDias, dadoAnomalo = false }) {
  if (dadoAnomalo) return 'DADO_ANOMALO';
  if (decimal(demandaMediaMensal).eq(0)) return 'SEM_DEMANDA';
  const estoque = decimal(estoqueAtual);
  const cobertura = coberturaDias === null ? new Prisma.Decimal(0) : decimal(coberturaDias);
  if (estoque.lte(0) || cobertura.lte(7)) return 'CRITICO';
  if (cobertura.lte(15)) return 'ALTO';
  if (cobertura.lt(decimal(coberturaDesejadaDias))) return 'MEDIO';
  return 'BAIXO';
}

export function classificarConfiancaHistorico(mesesConsiderados) {
  if (mesesConsiderados >= 6) return 'ALTA';
  if (mesesConsiderados >= 3) return 'MEDIA';
  return 'BAIXA';
}

export function detectarAnomalia(estoqueAtual) {
  return decimal(estoqueAtual).abs().gt(REPOSICAO_DEFAULTS.limiteEstoqueAnomalo);
}

function periodKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(key) {
  const [year, month] = key.split('-');
  return `${month}/${year}`;
}

function explanation({ demandaMediaMensal, estoqueAtual, coberturaDias, estoqueSeguranca, estoqueAlvo, quantidadeSugerida, coberturaDesejadaDias, margemSegurancaPercentual, risco }) {
  if (risco === 'DADO_ANOMALO') return 'Estoque atual apresenta valor anômalo e requer validação.';
  if (risco === 'SEM_DEMANDA') return 'Não há demanda registrada no histórico considerado; nenhuma compra foi sugerida automaticamente.';
  const coverage = coberturaDias === null ? 'indisponível' : `${outputDecimal(coberturaDias)} dias`;
  return `Demanda média de ${outputDecimal(demandaMediaMensal)} unidades/mês, estoque atual de ${outputDecimal(estoqueAtual)} unidades e cobertura estimada de ${coverage}. Para cobertura de ${outputDecimal(coberturaDesejadaDias)} dias com margem de segurança de ${outputDecimal(margemSegurancaPercentual)}%, o estoque alvo é ${outputDecimal(estoqueAlvo)} e a sugestão calculada é ${outputDecimal(quantidadeSugerida)} unidades.`;
}

function buildCalculation(product, periods, params) {
  const stock = product.estoque ? decimal(product.estoque.quantidadeAtual) : new Prisma.Decimal(0);
  const snapshots = new Set(product.estoqueSnapshots.map((snapshot) => periodKey(snapshot.dataReferencia)));
  const eligiblePeriods = periods.filter((period) => snapshots.has(period));
  const historyByPeriod = new Map(product.historicoVendas.map((item) => [`${item.anoReferencia}-${String(item.mesReferencia).padStart(2, '0')}`, decimal(item.quantidadeVendida)]));
  const quantities = eligiblePeriods.map((period) => historyByPeriod.get(period) || new Prisma.Decimal(0));
  const mesesConsiderados = quantities.length;
  const demandaMediaMensal = calcularDemandaMedia(quantities, mesesConsiderados || 1);
  const demandaMediaDiaria = calcularDemandaDiaria(demandaMediaMensal);
  const coberturaDias = calcularCobertura(stock, demandaMediaDiaria);
  const dadoAnomalo = detectarAnomalia(stock);
  const risco = classificarRisco({ estoqueAtual: stock, coberturaDias, demandaMediaMensal, coberturaDesejadaDias: params.coberturaDesejadaDias, dadoAnomalo });
  const estoqueSeguranca = calcularEstoqueSeguranca(demandaMediaMensal, params.coberturaDesejadaDias, params.margemSegurancaPercentual);
  const estoqueAlvo = calcularEstoqueAlvo(demandaMediaMensal, params.coberturaDesejadaDias, params.margemSegurancaPercentual);
  const quantidadeCalculada = dadoAnomalo ? new Prisma.Decimal(0) : calcularQuantidadeSugerida(estoqueAlvo, stock);
  const quantidadeSugerida = dadoAnomalo ? null : quantidadeCalculada.ceil();
  const warnings = [];
  if (stock.lt(0)) warnings.push('ESTOQUE_NEGATIVO');
  if (dadoAnomalo) warnings.push('DADO_ANOMALO');
  if (mesesConsiderados < periods.length) warnings.push('HISTORICO_INSUFICIENTE');
  const historico = eligiblePeriods.map((period, index) => ({ periodo: periodLabel(period), quantidade: outputDecimal(quantities[index]) }));
  return {
    produto: { idProduto: product.id, codigoExterno: product.codigoExterno, nome: product.nome, grupo: product.grupo, subGrupo: product.subGrupo, tipo: product.tipo },
    historico: { mesesConsiderados, quantidades: historico },
    demandaMediaMensal: outputDecimal(demandaMediaMensal),
    demandaMediaDiaria: outputDecimal(demandaMediaDiaria),
    estoqueAtual: outputDecimal(stock),
    coberturaDias: coberturaDias === null ? null : outputDecimal(coberturaDias),
    estoqueSeguranca: outputDecimal(estoqueSeguranca),
    estoqueAlvo: outputDecimal(estoqueAlvo),
    quantidadeCalculada: outputDecimal(quantidadeCalculada),
    quantidadeSugerida: quantidadeSugerida === null ? null : outputDecimal(quantidadeSugerida),
    risco,
    confianca: classificarConfiancaHistorico(mesesConsiderados),
    warnings,
    explicacao: explanation({ demandaMediaMensal, estoqueAtual: stock, coberturaDias, estoqueSeguranca, estoqueAlvo, quantidadeSugerida: quantidadeSugerida || new Prisma.Decimal(0), coberturaDesejadaDias: params.coberturaDesejadaDias, margemSegurancaPercentual: params.margemSegurancaPercentual, risco }),
  };
}

export async function simularReposicao(filters = {}) {
  const parameter = await prisma.parametroReposicao.findFirst({ orderBy: { id: 'desc' } });
  const params = {
    coberturaDesejadaDias: REPOSICAO_DEFAULTS.coberturaDesejadaDias,
    margemSegurancaPercentual: REPOSICAO_DEFAULTS.margemSegurancaPercentual,
    fonte: 'DEFAULT_DO_SISTEMA',
  };
  if (parameter) {
    params.coberturaDesejadaDias = decimal(parameter.coberturaDesejadaDias);
    params.margemSegurancaPercentual = decimal(parameter.margemSeguranca);
    params.fonte = `ParametroReposicao:${parameter.id}`;
  }
  if (filters.coberturaDesejadaDias !== undefined) params.coberturaDesejadaDias = decimal(filters.coberturaDesejadaDias);
  if (filters.margemSegurancaPercentual !== undefined) params.margemSegurancaPercentual = decimal(filters.margemSegurancaPercentual);
  const where = { estoque: { isNot: null } };
  if (filters.grupo) where.grupo = filters.grupo;
  if (filters.subGrupo) where.subGrupo = filters.subGrupo;
  if (filters.produto) where.OR = [{ codigoExterno: { contains: filters.produto, mode: 'insensitive' } }, { nome: { contains: filters.produto, mode: 'insensitive' } }];
  const [products, snapshotDates] = await Promise.all([
    prisma.produto.findMany({ where, include: { estoque: true, historicoVendas: true, estoqueSnapshots: { select: { dataReferencia: true } } }, orderBy: { id: 'asc' } }),
    prisma.estoqueSnapshot.findMany({ distinct: ['dataReferencia'], select: { dataReferencia: true }, orderBy: { dataReferencia: 'asc' } }),
  ]);
  const periods = snapshotDates.map((row) => periodKey(row.dataReferencia));
  const calculations = products.map((product) => buildCalculation(product, periods, params));
  const filtered = filters.risco ? calculations.filter((item) => item.risco === filters.risco) : calculations;
  const summary = filtered.reduce((result, item) => {
    result[item.risco] = (result[item.risco] || 0) + 1;
    if (item.quantidadeSugerida !== null && new Prisma.Decimal(item.quantidadeSugerida).gt(0)) { result.sugestoesPositivas += 1; result.quantidadeTotalSugerida = result.quantidadeTotalSugerida.plus(new Prisma.Decimal(item.quantidadeSugerida)); }
    if (item.historico.mesesConsiderados < periods.length) result.semHistoricoSuficiente += 1;
    if (item.warnings.includes('ESTOQUE_NEGATIVO')) result.estoqueNegativo += 1;
    if (item.warnings.includes('DADO_ANOMALO')) result.estoqueAnomalo += 1;
    return result;
  }, { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0, SEM_DEMANDA: 0, DADO_ANOMALO: 0, sugestoesPositivas: 0, quantidadeTotalSugerida: new Prisma.Decimal(0), semHistoricoSuficiente: 0, estoqueNegativo: 0, estoqueAnomalo: 0 });
  return { parametros: { ...params, coberturaDesejadaDias: outputDecimal(params.coberturaDesejadaDias), margemSegurancaPercentual: outputDecimal(params.margemSegurancaPercentual) }, historicoMeses: periods.length, periodos: periods.map(periodLabel), totalProdutosAnalisados: filtered.length, resumo: { ...summary, quantidadeTotalSugerida: outputDecimal(summary.quantidadeTotalSugerida) }, resultados: filtered };
}

function parsePeriodLabel(label) {
  const [month, year] = label.split('/').map(Number);
  return { month, year };
}

export async function gerarReposicao(audit = {}) {
  const simulation = await simularReposicao();
  if (!simulation.periodos.length) throw new Error('Não há períodos de estoque disponíveis para gerar reposição.');
  const latest = parsePeriodLabel(simulation.periodos[simulation.periodos.length - 1]);
  const periodoReferencia = simulation.periodos[simulation.periodos.length - 1];
  return prisma.$transaction(async (tx) => {
    const existingReport = await tx.relatorioReposicao.findUnique({ where: { periodoReferencia } });
    if (existingReport) throw conflict('REPLENISHMENT_ALREADY_GENERATED', `As sugestões de reposição para ${periodoReferencia} já foram geradas.`);
    let parametro = await tx.parametroReposicao.findFirst({ orderBy: { id: 'desc' } });
    if (!parametro) parametro = await tx.parametroReposicao.create({ data: { margemSeguranca: new Prisma.Decimal(simulation.parametros.margemSegurancaPercentual), periodoAnaliseMeses: simulation.historicoMeses, estoqueMinimoPadrao: 0 } });
    const relatorio = await tx.relatorioReposicao.create({ data: { periodoReferencia } });
    await tx.calculoReposicao.createMany({ data: simulation.resultados.map((item) => ({
      parametroId: parametro.id, relatorioId: relatorio.id, produtoId: item.produto.idProduto, mesReferencia: latest.month, anoReferencia: latest.year,
      mesesHistorico: item.historico.mesesConsiderados, demandaMedia: new Prisma.Decimal(item.demandaMediaMensal), demandaMediaDiaria: new Prisma.Decimal(item.demandaMediaDiaria), estoqueAtual: new Prisma.Decimal(item.estoqueAtual),
      coberturaDias: item.coberturaDias === null ? null : new Prisma.Decimal(item.coberturaDias), coberturaDesejadaDias: new Prisma.Decimal(simulation.parametros.coberturaDesejadaDias), margemSeguranca: new Prisma.Decimal(simulation.parametros.margemSegurancaPercentual),
      estoqueSeguranca: new Prisma.Decimal(item.estoqueSeguranca), estoqueAlvo: new Prisma.Decimal(item.estoqueAlvo), quantidadeCalculada: new Prisma.Decimal(item.quantidadeCalculada), quantidadeRecomendada: item.quantidadeSugerida === null ? 0 : Number(item.quantidadeSugerida),
      riscoFalta: item.risco === 'CRITICO' || item.risco === 'ALTO', risco: item.risco, confianca: item.confianca, historicoInsuficiente: item.warnings.includes('HISTORICO_INSUFICIENTE'), warnings: item.warnings,
    })) });
    const calculations = await tx.calculoReposicao.findMany({ where: { relatorioId: relatorio.id }, select: { id: true, produtoId: true } });
    const calculationByProduct = new Map(calculations.map((item) => [item.produtoId, item.id]));
    const actionable = simulation.resultados.filter((item) => item.quantidadeSugerida !== null && Number(item.quantidadeSugerida) > 0 && item.risco !== 'DADO_ANOMALO' && item.risco !== 'SEM_DEMANDA');
    const suggestions = await tx.sugestaoCompra.createManyAndReturn({ data: actionable.map((item) => ({ calculoId: calculationByProduct.get(item.produto.idProduto), produtoId: item.produto.idProduto, quantidadeSugerida: Number(item.quantidadeSugerida) })) });
    if (suggestions.length) await tx.relatorioSugestao.createMany({ data: suggestions.map((suggestion) => ({ relatorioId: relatorio.id, sugestaoId: suggestion.id })) });
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'REPOSICAO', recursoId: relatorio.id, acao: 'GERAR', descricao: `Cálculo de reposição do período ${periodoReferencia} gerado.`, dados: { periodo: periodoReferencia, calculos: calculations.length, sugestoes: suggestions.length, quantidadeTotalSugerida: actionable.reduce((total, item) => total + Number(item.quantidadeSugerida), 0) } });
    return { status: 'GERADO', persistido: true, periodo: latest, relatorioId: relatorio.id, resumo: { calculosCriados: calculations.length, sugestoesCriadas: suggestions.length, quantidadeTotalSugerida: actionable.reduce((total, item) => total + Number(item.quantidadeSugerida), 0) } };
  }, { maxWait: 10000, timeout: 120000 });
}

const RISK_ORDER = { CRITICO: 1, ALTO: 2, MEDIO: 3, BAIXO: 4, SEM_DEMANDA: 5, DADO_ANOMALO: 6 };
export const PEDIDOS_ATIVOS = Object.freeze(['PENDENTE', 'PEDIDO', 'RECEBIDO']);

function pedidoResumo(pedido) {
  if (!pedido) return null;
  return {
    id: pedido.id,
    status: pedido.status,
    dataPedido: pedido.dataPedido,
    fornecedor: pedido.fornecedor ? { id: pedido.fornecedor.id, nome: pedido.fornecedor.nome } : null,
  };
}

export function derivarStatusOperacional(sugestao) {
  const pedidos = (sugestao.itensPedido || [])
    .map((item) => item.pedido)
    .filter(Boolean)
    .sort((a, b) => new Date(b.dataPedido) - new Date(a.dataPedido));
  const pedidoAtual = pedidos.find((pedido) => PEDIDOS_ATIVOS.includes(pedido.status)) || null;
  const ultimoPedido = pedidos[0] || null;
  const statusOperacional = pedidoAtual?.status || (ultimoPedido?.status === 'CANCELADO' ? 'CANCELADO' : 'PENDENTE');
  return {
    statusOperacional,
    podeRegistrarPedido: !pedidoAtual,
    pedidoAtual: pedidoResumo(pedidoAtual),
    ultimoPedido: pedidoResumo(ultimoPedido),
  };
}

function queryProductFilter(filters) {
  const product = {};
  const search = filters.produto || filters.search;
  if (search) product.OR = [{ codigoExterno: { contains: search, mode: 'insensitive' } }, { nome: { contains: search, mode: 'insensitive' } }];
  if (filters.grupo) product.grupo = filters.grupo;
  if (filters.subGrupo) product.subGrupo = filters.subGrupo;
  return Object.keys(product).length ? { produto: product } : {};
}

export async function listarCalculos(filters = {}) {
  const where = { ...queryProductFilter(filters), ...(filters.risco ? { risco: filters.risco } : {}), ...(filters.confianca ? { confianca: filters.confianca } : {}) };
  return prisma.calculoReposicao.findMany({ where, include: { produto: true, relatorio: true }, orderBy: [{ dataCalculo: 'desc' }, { id: 'desc' }] });
}

export async function listarSugestoes(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const where = { ...queryProductFilter(filters), ...(filters.status ? { status: filters.status } : {}), ...(filters.risco || filters.confianca ? { calculo: { ...(filters.risco ? { risco: filters.risco } : {}), ...(filters.confianca ? { confianca: filters.confianca } : {}) } } : {}) };
  const rows = await prisma.sugestaoCompra.findMany({ where, include: { produto: true, calculo: { include: { relatorio: true } }, itensPedido: { select: { pedido: { select: { id: true, status: true, dataPedido: true, fornecedor: { select: { id: true, nome: true } } } } } } } });
  const sorted = rows.sort((a, b) => {
    const risk = RISK_ORDER[a.calculo.risco] - RISK_ORDER[b.calculo.risco];
    if (risk) return risk;
    const coverageA = a.calculo.coberturaDias === null ? Number.POSITIVE_INFINITY : Number(a.calculo.coberturaDias);
    const coverageB = b.calculo.coberturaDias === null ? Number.POSITIVE_INFINITY : Number(b.calculo.coberturaDias);
    return coverageA - coverageB || b.quantidadeSugerida - a.quantidadeSugerida;
  });
  const facets = {
    grupos: [...new Set(rows.map((row) => row.produto.grupo).filter(Boolean))].sort(),
    subGrupos: [...new Set(rows.map((row) => row.produto.subGrupo).filter(Boolean))].sort(),
    status: [...new Set(rows.map((row) => row.status))].sort(),
    riscos: [...new Set(rows.map((row) => row.calculo.risco))],
    confiancas: [...new Set(rows.map((row) => row.calculo.confianca))],
  };
  const summary = { sugestoesGeradas: sorted.length, quantidadeTotalSugerida: sorted.reduce((total, row) => total + row.quantidadeSugerida, 0), criticas: sorted.filter((row) => row.calculo.risco === 'CRITICO').length, altoRisco: sorted.filter((row) => row.calculo.risco === 'ALTO').length };
  const data = sorted.slice((page - 1) * limit, page * limit).map((row) => ({ ...row, ...derivarStatusOperacional(row), itensPedido: undefined }));
  return { data, pagination: { page, limit, total: sorted.length, totalPages: sorted.length ? Math.ceil(sorted.length / limit) : 0 }, facets, summary };
}

export async function obterSugestao(id) {
  const result = await prisma.sugestaoCompra.findUnique({
    where: { id },
    include: {
      produto: {
        include: {
          historicoVendas: { orderBy: [{ anoReferencia: 'asc' }, { mesReferencia: 'asc' }] },
        },
      },
      calculo: { include: { relatorio: true, parametro: true } },
      itensPedido: { select: { pedido: { select: { id: true, status: true, dataPedido: true, fornecedor: { select: { id: true, nome: true } } } } } },
    },
  });
  return result ? { ...result, ...derivarStatusOperacional(result), itensPedido: undefined } : null;
}
