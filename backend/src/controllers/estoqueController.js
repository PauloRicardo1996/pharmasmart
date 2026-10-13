import * as service from '../services/estoqueService.js';
import { z } from 'zod';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { estoqueCreateSchema, estoqueUpdateSchema, idParamSchema, produtoIdParamSchema, validate } from '../validators/common.js';

const listSchema = paginationQuerySchema.extend({ status: z.enum(['ESTOQUE_BAIXO', 'NORMAL']).optional() });

export async function list(req, res) {
  const query = validate(listSchema, req.query);
  const result = await service.listEstoque(query);
  res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) });
}
export async function get(req, res) { res.json({ data: await service.getEstoque(validate(idParamSchema, req.params).id) }); }
export async function getByProduto(req, res) { res.json({ data: await service.getEstoqueByProduto(validate(produtoIdParamSchema, req.params).produtoId) }); }
export async function create(req, res) { res.status(201).json({ data: await service.createEstoque(validate(estoqueCreateSchema, req.body)) }); }
export async function update(req, res) { res.json({ data: await service.updateEstoque(validate(idParamSchema, req.params).id, validate(estoqueUpdateSchema, req.body)) }); }
