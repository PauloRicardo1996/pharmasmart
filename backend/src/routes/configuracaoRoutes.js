import { Router } from 'express';
import * as controller from '../controllers/configuracaoController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireRole } from '../middlewares/auth.js';

const router = Router();
router.get('/reposicao', requireRole('GERENTE'), asyncHandler(controller.getReposicao));
router.put('/reposicao', requireRole('GERENTE'), asyncHandler(controller.updateReposicao));
export default router;
