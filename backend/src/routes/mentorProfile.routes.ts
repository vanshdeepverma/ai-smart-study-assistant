import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { MentorProfileController } from '../controllers/mentorProfile.controller';
import { LearningMemoryController } from '../controllers/learningMemory.controller';

const router = Router();

router.use(requireAuth);

router.get('/profile', MentorProfileController.getProfile);
router.patch('/profile', MentorProfileController.updateProfile);

router.get('/weaknesses', MentorProfileController.getWeaknesses);

router.get('/recommendations', MentorProfileController.getRecommendations);
router.post('/recommendations/:id/dismiss', MentorProfileController.dismissRecommendation);

router.get('/memories', LearningMemoryController.getMemories);
router.post('/memories', LearningMemoryController.createMemory);
router.get('/memories/:id', LearningMemoryController.getMemoryById);
router.patch('/memories/:id', LearningMemoryController.updateMemoryResolution);
router.delete('/memories/:id', LearningMemoryController.deleteMemory);

export default router;
