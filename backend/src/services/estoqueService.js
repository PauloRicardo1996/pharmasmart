import * as repository from '../repositories/estoqueRepository.js';
import { conflict, notFound } from '../utils/apiError.js';

function ensureEstoque(estoque) {
  if (!estoque) throw notFound('STOCK_NOT_FOUND', 'Registro de estoque não encontrado.');
  return estoque;
}

function withStatus(estoque) {
  return { ...estoque, status: estoque.quantidadeAtual <= estoque.quantidadeMinima ? 'ESTOQUE_BAIXO' : 'NORMAL' };
}

export async function listEstoque(query) {
  const [rows] = await repository.listEstoque(query);
  const filtered = query.status ? rows.filter((row) => withStatus(row).status === query.status) : rows;
  const start = (query.page - 1) * query.limit;
  return { data: filtered.slice(start, start + query.limit).map(withStatus), total: filtered.length };
}

export async function getEstoque(id) { return withStatus(ensureEstoque(await repository.findEstoqueById(id))); }
export async function getEstoqueByProduto(produtoId) { return withStatus(ensureEstoque(await repository.findEstoqueByProdutoId(produtoId))); }

export async function createEstoque(data) {
  if ((await repository.produtoExists(data.produtoId)) === 0) throw notFound('PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  if (await repository.findEstoqueByProdutoId(data.produtoId)) {
    throw conflict('STOCK_ALREADY_EXISTS', 'Já existe um registro de estoque para este produto.');
  }
  return withStatus(await repository.createEstoque(data));
}

export async function updateEstoque(id, data) {
  ensureEstoque(await repository.findEstoqueById(id));
  return withStatus(await repository.updateEstoque(id, data));
}
