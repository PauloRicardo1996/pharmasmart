import { request } from './api.js';

function queryString(params = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); }); return query.toString() ? `?${query}` : ''; }
export function listarHistorico(params) { return request(`/historico${queryString(params)}`); }
export function buscarHistoricoProduto(id, params) { return request(`/historico/produtos/${id}${queryString(params)}`); }
