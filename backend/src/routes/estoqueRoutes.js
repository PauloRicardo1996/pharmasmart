import { Router } from 'express';
import * as controller from '../controllers/estoqueController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(controller.list));
router.get('/produto/:produtoId', asyncHandler(controller.getByProduto));
router.get('/:id', asyncHandler(controller.get));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
export default router;
