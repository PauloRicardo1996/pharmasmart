import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as controller from '../controllers/historicoController.js';

const router = Router();
router.get('/', asyncHandler(controller.list));
router.get('/produtos/:produtoId', asyncHandler(controller.product));

export default router;
