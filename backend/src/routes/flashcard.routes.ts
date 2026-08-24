import { Router } from 'express';
import { FlashcardController } from '../controllers/flashcard.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', FlashcardController.getFlashcards);

export default router;
