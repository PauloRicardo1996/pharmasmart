import * as service from '../services/fornecedorService.js';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { fornecedorCreateSchema, fornecedorUpdateSchema, idParamSchema, validate } from '../validators/common.js';
import { registrarAuditoria, requestMeta } from '../services/auditoriaService.js';

export async function list(req, res) { const query = validate(paginationQuerySchema, req.query); const result = await service.listFornecedores(query); res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) }); }
export async function get(req, res) { res.json({ data: await service.getFornecedor(validate(idParamSchema, req.params).id) }); }
export async function create(req, res) { const data = await service.createFornecedor(validate(fornecedorCreateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'FORNECEDOR', recursoId: data.id, acao: 'CRIAR', descricao: 'Fornecedor criado.', dados: { nome: data.nome }, ...requestMeta(req) }); res.status(201).json({ data }); }
export async function update(req, res) { const id = validate(idParamSchema, req.params).id; const data = await service.updateFornecedor(id, validate(fornecedorUpdateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'FORNECEDOR', recursoId: id, acao: 'ALTERAR', descricao: 'Fornecedor alterado.', dados: { campos: Object.keys(req.body || {}) }, ...requestMeta(req) }); res.json({ data }); }
export async function remove(req, res) { const id = validate(idParamSchema, req.params).id; await service.deleteFornecedor(id); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'FORNECEDOR', recursoId: id, acao: 'DESATIVAR', descricao: 'Fornecedor removido.', ...requestMeta(req) }); res.status(204).send(); }

