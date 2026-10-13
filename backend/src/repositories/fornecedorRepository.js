import { prisma } from '../lib/prisma.js';

export function listFornecedores({ page, limit, search }) {
  const where = search ? { OR: [
    { nome: { contains: search, mode: 'insensitive' } },
    { cnpj: { contains: search } },
  ] } : {};
  return Promise.all([
    prisma.fornecedor.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' } }),
    prisma.fornecedor.count({ where }),
  ]);
}

export function findFornecedorById(id) { return prisma.fornecedor.findUnique({ where: { id } }); }
export function createFornecedor(data) { return prisma.fornecedor.create({ data }); }
export function updateFornecedor(id, data) { return prisma.fornecedor.update({ where: { id }, data }); }
export function deleteFornecedor(id) { return prisma.fornecedor.delete({ where: { id } }); }
export function countFornecedorRelations(id) { return prisma.pedidoCompra.count({ where: { fornecedorId: id } }); }

