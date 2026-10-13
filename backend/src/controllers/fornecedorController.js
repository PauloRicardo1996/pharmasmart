import * as service from '../services/fornecedorService.js';
import { pagination, paginationQuerySchema } from '../utils/query.js';
import { fornecedorCreateSchema, fornecedorUpdateSchema, idParamSchema, validate } from '../validators/common.js';

export async function list(req, res) { const query = validate(paginationQuerySchema, req.query); const result = await service.listFornecedores(query); res.json({ data: result.data, pagination: pagination(query.page, query.limit, result.total) }); }
export async function get(req, res) { res.json({ data: await service.getFornecedor(validate(idParamSchema, req.params).id) }); }
export async function create(req, res) { res.status(201).json({ data: await service.createFornecedor(validate(fornecedorCreateSchema, req.body)) }); }
export async function update(req, res) { res.json({ data: await service.updateFornecedor(validate(idParamSchema, req.params).id, validate(fornecedorUpdateSchema, req.body)) }); }
export async function remove(req, res) { await service.deleteFornecedor(validate(idParamSchema, req.params).id); res.status(204).send(); }

