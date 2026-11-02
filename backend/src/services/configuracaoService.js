import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../utils/apiError.js';
import { registrarAuditoria } from './auditoriaService.js';

const LIMITES = Object.freeze({ coberturaMinima: 1, coberturaMaxima: 365, margemMinima: 0, margemMaxima: 100 });

function parseDecimal(value, label) {
  try {
    const decimal = new Prisma.Decimal(String(value).replace(',', '.'));
    if (!decimal.isFinite()) throw new Error();
    return decimal;
  } catch { throw badRequest('INVALID_REPLENISHMENT_PARAMETER', `${label} deve ser um número válido.`); }
}

function validate(data) {
  const cobertura = parseDecimal(data.coberturaDesejadaDias, 'Cobertura desejada');
  const margem = parseDecimal(data.margemSegurancaPercentual, 'Margem de segurança');
  if (cobertura.lt(LIMITES.coberturaMinima) || cobertura.gt(LIMITES.coberturaMaxima)) throw badRequest('INVALID_COVERAGE', 'A cobertura desejada deve estar entre 1 e 365 dias.');
  if (margem.lt(LIMITES.margemMinima) || margem.gt(LIMITES.margemMaxima)) throw badRequest('INVALID_SAFETY_MARGIN', 'A margem de segurança deve estar entre 0% e 100%.');
  return { cobertura, margem };
}

function output(parameter) {
  return { id: parameter.id, coberturaDesejadaDias: parameter.coberturaDesejadaDias.toString(), margemSegurancaPercentual: parameter.margemSeguranca.toString(), periodoAnaliseMeses: parameter.periodoAnaliseMeses, estoqueMinimoPadrao: parameter.estoqueMinimoPadrao };
}

export async function obterParametrosReposicao() {
  const parameter = await prisma.parametroReposicao.findFirst({ orderBy: { id: 'desc' } });
  if (!parameter) return null;
  return output(parameter);
}

export async function atualizarParametrosReposicao(data, audit = {}) {
  const { cobertura, margem } = validate(data);
  const parameter = await prisma.parametroReposicao.findFirst({ orderBy: { id: 'desc' } });
  if (!parameter) throw notFound('REPLENISHMENT_PARAMETER_NOT_FOUND', 'Parâmetro de reposição não encontrado.');
  return prisma.$transaction(async (tx) => {
    const before = await tx.parametroReposicao.findUnique({ where: { id: parameter.id } });
    const updated = await tx.parametroReposicao.update({ where: { id: parameter.id }, data: { coberturaDesejadaDias: cobertura, margemSeguranca: margem } });
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'CONFIGURACAO_REPOSICAO', recursoId: updated.id, acao: 'ALTERAR', descricao: 'Parâmetros de reposição atualizados.', dados: { antes: { coberturaDesejadaDias: before.coberturaDesejadaDias.toString(), margemSegurancaPercentual: before.margemSeguranca.toString() }, depois: { coberturaDesejadaDias: updated.coberturaDesejadaDias.toString(), margemSegurancaPercentual: updated.margemSeguranca.toString() } } });
    return output(updated);
  });
}

export { LIMITES, validate };
