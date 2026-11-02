import { prisma } from '../lib/prisma.js';

const MAX_USER_AGENT = 500;
const OMIT_KEYS = /senha|hash|token|jwt|cookie|secret|database_url|password/i;

function sanitize(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return value.slice(0, 1000);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  return Object.fromEntries(Object.entries(value).filter(([key]) => !OMIT_KEYS.test(key)).slice(0, 50).map(([key, item]) => [key, sanitize(item, depth + 1)]));
}

export function requestMeta(req) {
  return { ip: req?.ip ? String(req.ip).slice(0, 100) : null, userAgent: req?.get?.('user-agent')?.slice(0, MAX_USER_AGENT) || null };
}

export async function registrarAuditoria({ usuarioId, acao, recurso, recursoId = null, descricao, dados = null, ip = null, userAgent = null, transaction = prisma }) {
  if (!usuarioId) return null;
  return transaction.auditoria.create({ data: { usuarioId: Number(usuarioId), acao, recurso, recursoId: recursoId === null || recursoId === undefined ? null : Number(recursoId), descricao: String(descricao).slice(0, 500), dados: dados === null ? undefined : sanitize(dados), ip: ip ? String(ip).slice(0, 100) : null, userAgent: userAgent ? String(userAgent).slice(0, MAX_USER_AGENT) : null } });
}

function whereFromQuery(query = {}) {
  const where = {};
  if (query.usuarioId) where.usuarioId = Number(query.usuarioId);
  if (query.acao) where.acao = query.acao;
  if (query.recurso) where.recurso = query.recurso;
  if (query.dataInicio || query.dataFim) where.criadoEm = { ...(query.dataInicio ? { gte: new Date(`${query.dataInicio}T00:00:00.000Z`) } : {}), ...(query.dataFim ? { lte: new Date(`${query.dataFim}T23:59:59.999Z`) } : {}) };
  return where;
}

export async function listarAuditorias(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where = whereFromQuery(query);
  const [data, total] = await Promise.all([
    prisma.auditoria.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { criadoEm: 'desc' }, include: { usuario: { select: { id: true, nome: true, login: true, perfil: true } } } }),
    prisma.auditoria.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 } };
}

export function obterAuditoria(id) {
  return prisma.auditoria.findUnique({ where: { id: Number(id) }, include: { usuario: { select: { id: true, nome: true, login: true, perfil: true } } } });
}
