import { Router } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/apiError.js';
import * as controller from '../controllers/importacaoController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { MAX_FILE_SIZE } from '../services/importacaoService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 3 } });
const router = Router();

function uploadPackage(req, res, next) {
  upload.fields([{ name: 'estoque', maxCount: 1 }, { name: 'entradas', maxCount: 1 }, { name: 'vendas', maxCount: 1 }])(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'FILE_TOO_LARGE', 'Cada arquivo deve ter no máximo 10 MB.'));
    return next(new ApiError(400, 'UPLOAD_ERROR', error.message || 'Não foi possível ler os arquivos enviados.'));
  });
}

router.post('/validar-periodo', uploadPackage, asyncHandler(controller.validatePeriod));
router.post('/confirmar', uploadPackage, asyncHandler(controller.confirmImport));

export default router;
