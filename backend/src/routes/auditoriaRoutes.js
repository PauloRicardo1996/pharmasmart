import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as controller from '../controllers/auditoriaController.js';

const router = Router();
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
export default router;
