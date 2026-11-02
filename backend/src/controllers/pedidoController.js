import * as service from '../services/pedidoService.js';
import { requestMeta } from '../services/auditoriaService.js';

export async function create(req, res) { res.status(201).json({ data: await service.criarPedido(req.body, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
export async function list(req, res) { res.json(await service.listarPedidos(req.query)); }
export async function get(req, res) { res.json({ data: await service.obterPedido(Number(req.params.id)) }); }
export async function update(req, res) { res.json({ data: await service.atualizarPedido(Number(req.params.id), req.body, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
export async function status(req, res) { res.json({ data: await service.alterarStatus(Number(req.params.id), req.body.status, { usuarioId: req.user.id, ...requestMeta(req) }) }); }
