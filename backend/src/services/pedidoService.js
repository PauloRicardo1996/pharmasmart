import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound } from '../utils/apiError.js';
import { registrarAuditoria } from './auditoriaService.js';

const STATUS_PENDENTE = 'PENDENTE';
const OPERATIONAL_STATUSES = new Set(['PENDENTE', 'PEDIDO', 'RECEBIDO', 'CANCELADO']);
const TRANSITIONS = {
  PENDENTE: new Set(['PEDIDO', 'CANCELADO']),
  PEDIDO: new Set(['RECEBIDO', 'CANCELADO']),
  RECEBIDO: new Set(),
  CANCELADO: new Set(),
};

function optionalDecimal(value, field = 'valorUnitario') {
  if (value === null || value === undefined || value === '') return null;
  try {
    const result = new Prisma.Decimal(String(value).replace(',', '.'));
    if (!result.isFinite() || result.lt(0)) throw badRequest('INVALID_ORDER_VALUE', `${field} deve ser um número não negativo.`);
    return result;
  } catch (error) {
    if (error.status === 400) throw error;
    throw badRequest('INVALID_ORDER_VALUE', `${field} deve ser um número válido.`);
  }
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('ORDER_WITHOUT_ITEMS', 'Informe pelo menos um item para o acompanhamento.');
  const ids = items.map((item) => Number(item.sugestaoId));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw badRequest('INVALID_SUGGESTION', 'Cada item deve informar uma sugestão válida.');
  if (new Set(ids).size !== ids.length) throw badRequest('DUPLICATE_ORDER_ITEM', 'O acompanhamento não pode conter a mesma sugestão mais de uma vez.');
  return items.map((item) => {
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw badRequest('INVALID_ORDER_QUANTITY', 'A quantidade de cada item deve ser um inteiro maior que zero.');
    return { sugestaoId: Number(item.sugestaoId), quantidade, precoUnitario: optionalDecimal(item.valorUnitario ?? item.precoUnitario) };
  });
}

function calculateTotal(rows) {
  if (rows.some((row) => row.precoUnitario === null)) return null;
  return rows.reduce((total, row) => total.add(row.subtotal), new Prisma.Decimal(0));
}

async function resolveItems(tx, items, allowedExistingSuggestionIds = new Set()) {
  const normalized = validateItems(items);
  const suggestions = await tx.sugestaoCompra.findMany({ where: { id: { in: normalized.map((item) => item.sugestaoId) } }, include: { produto: true, calculo: true, itensPedido: { select: { pedidoId: true } } } });
  const byId = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]));
  if (suggestions.length !== normalized.length) throw notFound('SUGGESTION_NOT_FOUND', 'Uma ou mais sugestões não foram encontradas.');
  const rows = [];
  for (const item of normalized) {
    const suggestion = byId.get(item.sugestaoId);
    if (suggestion.status === 'REJEITADA') throw conflict('SUGGESTION_NOT_ACTIONABLE', 'A sugestão rejeitada não pode virar acompanhamento.');
    if (suggestion.itensPedido?.some((linked) => !allowedExistingSuggestionIds.has(linked.pedidoId))) throw conflict('SUGGESTION_ALREADY_ORDERED', 'Uma ou mais sugestões já estão vinculadas a um acompanhamento.');
    const subtotal = item.precoUnitario === null ? null : item.precoUnitario.mul(item.quantidade);
    rows.push({ ...item, produtoId: suggestion.produtoId, subtotal });
  }
  return rows;
}

function optionalSupplierId(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('INVALID_SUPPLIER', 'Fornecedor inválido.');
  return id;
}

export async function criarPedido({ fornecedorId, itens }, audit = {}) {
  const idFornecedor = optionalSupplierId(fornecedorId);
  const normalizedItems = validateItems(itens);
  return prisma.$transaction(async (tx) => {
    if (idFornecedor !== null && !(await tx.fornecedor.findUnique({ where: { id: idFornecedor } }))) throw notFound('SUPPLIER_NOT_FOUND', 'Fornecedor não encontrado.');
    const rows = await resolveItems(tx, normalizedItems);
    const valorTotal = calculateTotal(rows);
    const pedido = await tx.pedidoCompra.create({ data: { fornecedorId: idFornecedor, status: STATUS_PENDENTE, valorTotal, itens: { create: rows.map((row) => ({ produtoId: row.produtoId, sugestaoId: row.sugestaoId, quantidade: row.quantidade, precoUnitario: row.precoUnitario, subtotal: row.subtotal })) } }, include: { fornecedor: true, itens: { include: { produto: true, sugestao: true } } } });
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'PEDIDO_COMPRA', recursoId: pedido.id, acao: 'CRIAR', descricao: 'Acompanhamento de reposição criado.', dados: { fornecedorId: pedido.fornecedorId, itens: pedido.itens.length, status: pedido.status, valorTotal: pedido.valorTotal?.toString() ?? null } });
    return pedido;
  });
}

function orderWhere(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.fornecedorId) where.fornecedorId = Number(filters.fornecedorId);
  if (filters.search && Number.isInteger(Number(filters.search))) where.id = Number(filters.search);
  if (filters.dataInicial || filters.dataFinal) where.dataPedido = { ...(filters.dataInicial ? { gte: new Date(`${filters.dataInicial}T00:00:00.000Z`) } : {}), ...(filters.dataFinal ? { lte: new Date(`${filters.dataFinal}T23:59:59.999Z`) } : {}) };
  return where;
}

export async function listarPedidos(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1); const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20)); const where = orderWhere(filters);
  const [data, total, statusCounts] = await Promise.all([
    prisma.pedidoCompra.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { dataPedido: 'desc' }, include: { fornecedor: true, _count: { select: { itens: true } } } }),
    prisma.pedidoCompra.count({ where }), prisma.pedidoCompra.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 }, summary: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])) };
}

export async function obterPedido(id) {
  const result = await prisma.pedidoCompra.findUnique({ where: { id }, include: { fornecedor: true, itens: { include: { produto: true, sugestao: { include: { calculo: true } } } } } });
  if (!result) throw notFound('ORDER_NOT_FOUND', 'Acompanhamento não encontrado.');
  return result;
}

export async function atualizarPedido(id, { fornecedorId, itens }, audit = {}) {
  const normalizedItems = validateItems(itens);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.pedidoCompra.findUnique({ where: { id } });
    if (!existing) throw notFound('ORDER_NOT_FOUND', 'Acompanhamento não encontrado.');
    if (existing.status !== STATUS_PENDENTE) throw conflict('ORDER_NOT_EDITABLE', 'Somente acompanhamentos pendentes podem ser editados.');
    const supplierId = optionalSupplierId(fornecedorId);
    if (supplierId !== null && !(await tx.fornecedor.findUnique({ where: { id: supplierId } }))) throw notFound('SUPPLIER_NOT_FOUND', 'Fornecedor não encontrado.');
    const oldItems = await tx.itemPedidoCompra.findMany({ where: { pedidoId: id } });
    const rows = await resolveItems(tx, normalizedItems, new Set(oldItems.map((item) => item.sugestaoId)));
    const suggestionIds = new Set(rows.map((row) => row.sugestaoId));
    for (const old of oldItems) if (!suggestionIds.has(old.sugestaoId)) await tx.itemPedidoCompra.delete({ where: { id: old.id } });
    for (const row of rows) {
      const current = oldItems.find((old) => old.sugestaoId === row.sugestaoId);
      if (current) await tx.itemPedidoCompra.update({ where: { id: current.id }, data: { quantidade: row.quantidade, precoUnitario: row.precoUnitario, subtotal: row.subtotal } });
      else await tx.itemPedidoCompra.create({ data: { pedidoId: id, produtoId: row.produtoId, sugestaoId: row.sugestaoId, quantidade: row.quantidade, precoUnitario: row.precoUnitario, subtotal: row.subtotal } });
    }
    const valorTotal = calculateTotal(rows);
    const pedido = await tx.pedidoCompra.update({ where: { id }, data: { fornecedorId: supplierId, valorTotal }, include: { fornecedor: true, itens: { include: { produto: true, sugestao: true } } } });
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'PEDIDO_COMPRA', recursoId: id, acao: 'ALTERAR', descricao: 'Acompanhamento de reposição alterado.', dados: { fornecedorId: pedido.fornecedorId, itens: pedido.itens.length, status: pedido.status, valorTotal: pedido.valorTotal?.toString() ?? null } });
    return pedido;
  });
}

export function validateStatusTransition(from, to) {
  if (!OPERATIONAL_STATUSES.has(to)) throw badRequest('INVALID_ORDER_STATUS', 'Status de acompanhamento inválido.');
  if (!OPERATIONAL_STATUSES.has(from) || !TRANSITIONS[from]?.has(to)) throw conflict('ORDER_STATUS_INVALID', `A transição de ${from} para ${to} não é permitida.`);
}

export async function alterarStatus(id, status, audit = {}) {
  const current = await prisma.pedidoCompra.findUnique({ where: { id } });
  if (!current) throw notFound('ORDER_NOT_FOUND', 'Acompanhamento não encontrado.');
  validateStatusTransition(current.status, status);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.pedidoCompra.update({ where: { id }, data: { status }, include: { fornecedor: true, itens: { include: { produto: true } } } });
    await registrarAuditoria({ ...audit, transaction: tx, recurso: 'PEDIDO_COMPRA', recursoId: id, acao: 'ALTERAR_STATUS', descricao: 'Status do acompanhamento de reposição alterado.', dados: { statusAntes: current.status, statusDepois: updated.status } });
    return updated;
  });
}

export { validateItems };
