import { confirmImportPackage, validateImportPackage } from '../services/importacaoService.js';
import { requestMeta } from '../services/auditoriaService.js';

export async function validatePeriod(req, res) {
  const result = validateImportPackage({ files: req.files, month: req.body.month, year: req.body.year });
  res.json({ data: result });
}

export async function confirmImport(req, res) {
  const result = await confirmImportPackage({ files: req.files, month: req.body.month, year: req.body.year }, { usuarioId: req.user.id, ...requestMeta(req) });
  res.status(201).json({ data: result });
}
