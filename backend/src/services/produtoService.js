import * as repository from '../repositories/produtoRepository.js';
import { conflict, notFound } from '../utils/apiError.js';

function ensureProduto(produto) {
  if (!produto) throw notFound('PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  return produto;
}

export async function listProdutos(query) {
  const [data, total] = await repository.listProdutos(query);
  return { data, total };
}

export async function getProduto(id) { return ensureProduto(await repository.findProdutoById(id)); }
export async function createProduto(data) { return repository.createProduto(data); }
export async function updateProduto(id, data) {
  ensureProduto(await repository.findProdutoById(id));
  return repository.updateProduto(id, data);
}

export async function deleteProduto(id) {
  ensureProduto(await repository.findProdutoById(id));
  const relations = await repository.countProdutoRelations(id);
  const relatedCount = relations.reduce((sum, count) => sum + count, 0);
  if (relatedCount > 0) {
    throw conflict('PRODUCT_HAS_RELATIONS', 'Produto possui registros relacionados e não pode ser excluído.');
  }
  await repository.deleteProduto(id);
}

