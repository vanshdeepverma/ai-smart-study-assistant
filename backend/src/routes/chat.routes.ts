import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/sessions', ChatController.getSessions);
router.post('/sessions', ChatController.createSession);
router.delete('/sessions/:sessionId', ChatController.deleteSession);

router.get('/sessions/:sessionId/focus', ChatController.getSessionFocus);
router.patch('/sessions/:sessionId/focus', ChatController.updateSessionFocus);

router.get('/sessions/:sessionId/mode', ChatController.getSessionMode);
router.patch('/sessions/:sessionId/mode', ChatController.updateSessionMode);

router.get('/sessions/:sessionId/messages', ChatController.getSessionMessages);
router.post('/sessions/:sessionId/messages', ChatController.addUserMessage);
router.post('/sessions/:sessionId/messages/stream', ChatController.streamMessage);

export default router;
