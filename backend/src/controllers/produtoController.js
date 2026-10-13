import * as service from '../services/produtoService.js';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { idParamSchema, produtoCreateSchema, produtoUpdateSchema, validate } from '../validators/common.js';

export async function list(req, res) {
  const query = validate(paginationQuerySchema.extend({ tipo: produtoCreateSchema.shape.tipo.optional(), categoria: produtoCreateSchema.shape.categoria.optional() }), req.query);
  const result = await service.listProdutos(query);
  res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) });
}
export async function get(req, res) { res.json({ data: await service.getProduto(validate(idParamSchema, req.params).id) }); }
export async function create(req, res) { res.status(201).json({ data: await service.createProduto(validate(produtoCreateSchema, req.body)) }); }
export async function update(req, res) { res.json({ data: await service.updateProduto(validate(idParamSchema, req.params).id, validate(produtoUpdateSchema, req.body)) }); }
export async function remove(req, res) { await service.deleteProduto(validate(idParamSchema, req.params).id); res.status(204).send(); }

