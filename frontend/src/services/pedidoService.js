import { request } from './api.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
  return query.toString() ? `?${query}` : '';
}
export function listarPedidos(params) { return request(`/pedidos${queryString(params)}`); }
export function obterPedido(id) { return request(`/pedidos/${id}`); }
export function criarPedido(data) { return request('/pedidos', { method: 'POST', body: JSON.stringify(data) }); }
export function atualizarPedido(id, data) { return request(`/pedidos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function alterarStatus(id, status) { return request(`/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
