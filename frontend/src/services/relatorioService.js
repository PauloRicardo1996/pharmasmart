import { request, API_URL } from './api.js';

function queryString(params = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); }); return query.toString() ? `?${query}` : ''; }
export function listarRelatorio(params) { return request(`/relatorios${queryString(params)}`); }
export function urlExportarRelatorio(params) { return `${API_URL}/relatorios/exportar${queryString(params)}`; }
