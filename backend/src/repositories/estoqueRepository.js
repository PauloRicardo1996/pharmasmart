import { prisma } from '../lib/prisma.js';

const includeProduto = { produto: { select: { id: true, nome: true, principioAtivo: true, categoria: true, tipo: true } } };

export function listEstoque({ page, limit, search }) {
  const where = search ? { produto: { nome: { contains: search, mode: 'insensitive' } } } : {};
  return Promise.all([
    prisma.estoque.findMany({ where, include: includeProduto, orderBy: { id: 'asc' } }),
    prisma.estoque.count({ where }),
  ]).then(([rows]) => [rows, rows.length]);
}

export function findEstoqueById(id) { return prisma.estoque.findUnique({ where: { id }, include: includeProduto }); }
export function findEstoqueByProdutoId(produtoId) { return prisma.estoque.findUnique({ where: { produtoId }, include: includeProduto }); }
export function createEstoque(data) { return prisma.estoque.create({ data, include: includeProduto }); }
export function updateEstoque(id, data) { return prisma.estoque.update({ where: { id }, data, include: includeProduto }); }
export function produtoExists(id) { return prisma.produto.count({ where: { id } }); }
