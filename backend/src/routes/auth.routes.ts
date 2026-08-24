import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', requireAuth, AuthController.getCurrentUser);

// Admin-only test route (Verification step 9)
router.get('/admin-test', requireAuth, requireRole(['ADMIN']), (_req, res) => {
  res.status(200).json(ApiResponse.success({ message: 'Welcome Admin' }, 'Admin access granted'));
});

export default router;
