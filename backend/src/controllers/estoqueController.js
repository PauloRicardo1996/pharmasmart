import * as service from '../services/estoqueService.js';
import { z } from 'zod';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { estoqueCreateSchema, estoqueUpdateSchema, idParamSchema, produtoIdParamSchema, validate } from '../validators/common.js';
import { registrarAuditoria, requestMeta } from '../services/auditoriaService.js';

const listSchema = paginationQuerySchema.extend({ status: z.enum(['ESTOQUE_BAIXO', 'NORMAL']).optional() });

export async function list(req, res) {
  const query = validate(listSchema, req.query);
  const result = await service.listEstoque(query);
  res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) });
}
export async function get(req, res) { res.json({ data: await service.getEstoque(validate(idParamSchema, req.params).id) }); }
export async function getByProduto(req, res) { res.json({ data: await service.getEstoqueByProduto(validate(produtoIdParamSchema, req.params).produtoId) }); }
export async function create(req, res) { const data = await service.createEstoque(validate(estoqueCreateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'ESTOQUE', recursoId: data.id, acao: 'CRIAR', descricao: 'Estoque criado.', dados: { produtoId: data.produtoId }, ...requestMeta(req) }); res.status(201).json({ data }); }
export async function update(req, res) { const id = validate(idParamSchema, req.params).id; const data = await service.updateEstoque(id, validate(estoqueUpdateSchema, req.body)); await registrarAuditoria({ usuarioId: req.user.id, recurso: 'ESTOQUE', recursoId: id, acao: 'ALTERAR', descricao: 'Estoque alterado manualmente.', dados: { produtoId: data.produtoId, quantidadeAtual: data.quantidadeAtual?.toString?.() ?? data.quantidadeAtual }, ...requestMeta(req) }); res.json({ data }); }
