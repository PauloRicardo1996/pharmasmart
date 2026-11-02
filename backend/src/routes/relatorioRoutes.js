import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as controller from '../controllers/relatorioController.js';

const router = Router();
router.get('/exportar', asyncHandler(controller.exportCsv));
router.get('/', asyncHandler(controller.list));
export default router;
