import * as service from '../services/historicoService.js';

export async function list(req, res) { res.json({ data: await service.listarHistorico(req.query) }); }
export async function product(req, res) { const result = await service.obterHistoricoProduto(Number(req.params.produtoId), req.query); if (!result) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado.' } }); return res.json({ data: result }); }
