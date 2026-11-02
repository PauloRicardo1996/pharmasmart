import * as service from '../services/usuarioService.js';
import { requestMeta } from '../services/auditoriaService.js';

export async function list(req, res) { res.json(await service.list(req.query)); }
export async function get(req, res) { const result = await service.get(req.params.id); if (!result) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' } }); return res.json({ data: result }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(req.body, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
export async function update(req, res) { res.json({ data: await service.update(req.params.id, req.body, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
