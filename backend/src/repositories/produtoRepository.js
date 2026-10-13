import { prisma } from '../lib/prisma.js';

export function listProdutos({ page, limit, search, tipo, categoria }) {
  const where = {
    ...(search ? { OR: [
      { nome: { contains: search, mode: 'insensitive' } },
      { principioAtivo: { contains: search, mode: 'insensitive' } },
    ] } : {}),
    ...(tipo ? { tipo } : {}),
    ...(categoria ? { categoria: { equals: categoria, mode: 'insensitive' } } : {}),
  };
  return Promise.all([
    prisma.produto.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' } }),
    prisma.produto.count({ where }),
  ]);
}

export function findProdutoById(id) { return prisma.produto.findUnique({ where: { id } }); }
export function createProduto(data) { return prisma.produto.create({ data }); }
export function updateProduto(id, data) { return prisma.produto.update({ where: { id }, data }); }
export function deleteProduto(id) { return prisma.produto.delete({ where: { id } }); }

export function countProdutoRelations(id) {
  return Promise.all([
    prisma.estoque.count({ where: { produtoId: id } }),
    prisma.historicoVenda.count({ where: { produtoId: id } }),
    prisma.calculoReposicao.count({ where: { produtoId: id } }),
    prisma.sugestaoCompra.count({ where: { produtoId: id } }),
    prisma.itemPedidoCompra.count({ where: { produtoId: id } }),
  ]);
}

