import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', QuizController.getQuizzes);
router.post('/generate', QuizController.generateQuiz);
router.get('/:id', QuizController.getQuizById);
router.post('/:id/attempt', QuizController.submitAttempt);

export default router;
