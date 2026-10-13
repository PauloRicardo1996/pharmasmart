import { request } from './api.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
  return query.toString() ? `?${query}` : '';
}

export function listFornecedores(params) { return request(`/fornecedores${queryString(params)}`); }
export function getFornecedor(id) { return request(`/fornecedores/${id}`); }
export function createFornecedor(data) { return request('/fornecedores', { method: 'POST', body: JSON.stringify(data) }); }
export function updateFornecedor(id, data) { return request(`/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteFornecedor(id) { return request(`/fornecedores/${id}`, { method: 'DELETE' }); }

