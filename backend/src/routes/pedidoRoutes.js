import { Router } from 'express';
import * as controller from '../controllers/pedidoController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/', asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.patch('/:id/status', asyncHandler(controller.status));
export default router;
