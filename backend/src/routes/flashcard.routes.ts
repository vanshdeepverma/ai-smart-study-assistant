import { Router } from 'express';
import { FlashcardController } from '../controllers/flashcard.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', FlashcardController.getFlashcards);
router.post('/generate', FlashcardController.generateFlashcards);
router.delete('/:id', FlashcardController.deleteFlashcard);
router.patch('/:id/rating', FlashcardController.rateFlashcard);

export default router;
