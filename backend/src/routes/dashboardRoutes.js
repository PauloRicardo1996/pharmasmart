import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as controller from '../controllers/dashboardController.js';

const router = Router();
router.get('/', asyncHandler(controller.summary));

export default router;
