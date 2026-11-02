import { request } from './api.js';

export function listarAuditorias(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)); return request(`/auditoria?${query}`); }
export function obterAuditoria(id) { return request(`/auditoria/${id}`); }
