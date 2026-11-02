import { Router } from 'express';
import * as controller from '../controllers/reposicaoController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/simular', asyncHandler(controller.simulate));
router.post('/gerar', asyncHandler(controller.generate));
router.get('/calculos', asyncHandler(controller.calculations));
router.get('/sugestoes', asyncHandler(controller.suggestions));
router.get('/sugestoes/:id', asyncHandler(controller.suggestion));
export default router;
