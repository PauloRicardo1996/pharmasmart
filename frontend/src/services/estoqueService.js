import { request } from './api.js';
import { listProdutos } from './produtoService.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
  return query.toString() ? `?${query}` : '';
}

export function listEstoque(params) { return request(`/estoque${queryString(params)}`); }
export function getEstoque(id) { return request(`/estoque/${id}`); }
export function getEstoqueByProduto(produtoId) { return request(`/estoque/produto/${produtoId}`); }
export function createEstoque(data) { return request('/estoque', { method: 'POST', body: JSON.stringify(data) }); }
export function updateEstoque(id, data) { return request(`/estoque/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export { listProdutos };

