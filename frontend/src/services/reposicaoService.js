import { request } from './api.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
  return query.toString() ? `?${query}` : '';
}

export function listarSugestoes(params) { return request(`/reposicao/sugestoes${queryString(params)}`); }
export function buscarSugestaoPorId(id) { return request(`/reposicao/sugestoes/${id}`); }
