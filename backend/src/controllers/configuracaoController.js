import * as service from '../services/configuracaoService.js';
import { requestMeta } from '../services/auditoriaService.js';

export async function getReposicao(_req, res) {
  const data = await service.obterParametrosReposicao();
  if (!data) return res.status(404).json({ error: { code: 'REPLENISHMENT_PARAMETER_NOT_FOUND', message: 'Parâmetro de reposição não encontrado.' } });
  return res.json({ data });
}

export async function updateReposicao(req, res) { res.json({ data: await service.atualizarParametrosReposicao(req.body, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
