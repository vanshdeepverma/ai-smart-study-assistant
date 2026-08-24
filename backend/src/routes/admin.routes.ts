import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Protect all admin routes
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/stats', AdminController.getSystemStats);
router.get('/users', AdminController.getUsers);

export default router;
