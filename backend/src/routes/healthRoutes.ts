import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { validate } from '../middlewares/validate';
import { echoSchema } from '../validators/healthValidator';

const router = Router();

router.get('/', HealthController.check);
router.post('/echo', validate(echoSchema), HealthController.echo);

export default router;
