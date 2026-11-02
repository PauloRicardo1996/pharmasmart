import * as service from '../services/produtoService.js';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { idParamSchema, produtoCreateSchema, produtoUpdateSchema, validate } from '../validators/common.js';
import { registrarAuditoria, requestMeta } from '../services/auditoriaService.js';

export async function list(req, res) {
  const query = validate(paginationQuerySchema.extend({ tipo: produtoCreateSchema.shape.tipo.optional(), categoria: produtoCreateSchema.shape.categoria.optional() }), req.query);
  const result = await service.listProdutos(query);
  res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) });
}
export async function get(req, res) { res.json({ data: await service.getProduto(validate(idParamSchema, req.params).id) }); }
export async function create(req, res) { const data = await service.createProduto(validate(produtoCreateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'PRODUTO', recursoId: data.id, acao: 'CRIAR', descricao: 'Produto criado.', dados: { codigoExterno: data.codigoExterno }, ...requestMeta(req) }); res.status(201).json({ data }); }
export async function update(req, res) { const id = validate(idParamSchema, req.params).id; const data = await service.updateProduto(id, validate(produtoUpdateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'PRODUTO', recursoId: id, acao: 'ALTERAR', descricao: 'Produto alterado.', dados: { campos: Object.keys(req.body || {}) }, ...requestMeta(req) }); res.json({ data }); }
export async function remove(req, res) { const id = validate(idParamSchema, req.params).id; await service.deleteProduto(id); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'PRODUTO', recursoId: id, acao: 'DESATIVAR', descricao: 'Produto removido.', ...requestMeta(req) }); res.status(204).send(); }

