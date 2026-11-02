import { request } from './api.js';
function queryString(params = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); }); return query.toString() ? `?${query}` : ''; }
export function listarUsuarios(params) { return request(`/usuarios${queryString(params)}`); }
export function criarUsuario(data) { return request('/usuarios', { method: 'POST', body: JSON.stringify(data) }); }
export function atualizarUsuario(id, data) { return request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
