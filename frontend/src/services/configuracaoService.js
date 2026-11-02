import { request } from './api.js';

export function obterParametrosReposicao() { return request('/configuracoes/reposicao'); }
export function atualizarParametrosReposicao(data) { return request('/configuracoes/reposicao', { method: 'PUT', body: JSON.stringify(data) }); }
