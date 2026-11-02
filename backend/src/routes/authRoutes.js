import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import * as controller from '../controllers/authController.js';

const router = Router();
router.post('/login', asyncHandler(controller.signIn));
router.post('/logout', asyncHandler(controller.signOut));
router.get('/me', requireAuth, asyncHandler(controller.me));
export default router;
