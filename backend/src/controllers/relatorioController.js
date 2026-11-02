import * as service from '../services/relatorioService.js';

export async function list(req, res) { res.json({ data: await service.listarRelatorio(req.query) }); }
export async function exportCsv(req, res) { const report = await service.listarRelatorio({ ...req.query, export: true }); res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="pharmasmart-${req.query.tipo || 'vendas'}-${report.periodo?.label || 'relatorio'}.csv"`); res.send(service.toCsv(report)); }
