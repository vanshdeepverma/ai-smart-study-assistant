import { Router } from 'express';
import healthRoutes from './healthRoutes';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);

import authRoutes from './auth.routes';

apiRouter.use('/auth', authRoutes);
import documentRoutes from './document.routes';

apiRouter.use('/documents', documentRoutes);

import userRoutes from './user.routes';
apiRouter.use('/users', userRoutes);

import adminRoutes from './admin.routes';
apiRouter.use('/admin', adminRoutes);

import quizRoutes from './quiz.routes';
apiRouter.use('/quizzes', quizRoutes);

import flashcardRoutes from './flashcard.routes';
apiRouter.use('/flashcards', flashcardRoutes);

import chatRoutes from './chat.routes';
apiRouter.use('/chat', chatRoutes);

import mentorProfileRoutes from './mentorProfile.routes';
apiRouter.use('/mentor', mentorProfileRoutes);

export default apiRouter;
