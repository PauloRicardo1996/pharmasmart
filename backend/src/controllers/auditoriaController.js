import * as service from '../services/auditoriaService.js';

export async function list(req, res) { res.json(await service.listarAuditorias(req.query)); }
export async function get(req, res) { const data = await service.obterAuditoria(req.params.id); if (!data) return res.status(404).json({ error: { code: 'AUDIT_NOT_FOUND', message: 'Registro de auditoria não encontrado.' } }); return res.json({ data }); }
