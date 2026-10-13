import { request } from './api.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
  return query.toString() ? `?${query}` : '';
}

export function listProdutos(params) { return request(`/produtos${queryString(params)}`); }
export function getProduto(id) { return request(`/produtos/${id}`); }
export function createProduto(data) { return request('/produtos', { method: 'POST', body: JSON.stringify(data) }); }
export function updateProduto(id, data) { return request(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteProduto(id) { return request(`/produtos/${id}`, { method: 'DELETE' }); }

