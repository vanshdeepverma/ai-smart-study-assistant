import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Protect all user routes
router.use(requireAuth);

router.get('/dashboard', UserController.getDashboardStats);

export default router;
