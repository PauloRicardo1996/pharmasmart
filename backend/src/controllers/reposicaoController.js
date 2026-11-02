import * as service from '../services/reposicaoService.js';
import { requestMeta } from '../services/auditoriaService.js';

export async function simulate(req, res) {
  const result = await service.simularReposicao({ produto: req.query.produto, risco: req.query.risco, grupo: req.query.grupo, subGrupo: req.query.subGrupo, coberturaDesejadaDias: req.query.coberturaDesejadaDias, margemSegurancaPercentual: req.query.margemSegurancaPercentual });
  res.json({ data: result });
}

export async function generate(req, res) {
  res.status(201).json({ data: await service.gerarReposicao({ usuarioId: req.user.id, ...requestMeta(req) }) });
}

export async function calculations(req, res) {
  res.json({ data: await service.listarCalculos(req.query) });
}

export async function suggestions(req, res) {
  const result = await service.listarSugestoes(req.query);
  res.json(result);
}

export async function suggestion(req, res) {
  const result = await service.obterSugestao(Number(req.params.id));
  if (!result) return res.status(404).json({ error: { code: 'SUGGESTION_NOT_FOUND', message: 'Sugestão não encontrada.' } });
  return res.json({ data: result });
}
