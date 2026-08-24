import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { ApiResponse } from '../utils/ApiResponse';
import { ChatService } from '../services/chat.service';

export class ChatController {
  /**
   * Get all chat sessions for the authenticated user
   */
  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          focusedDocument: {
            select: { id: true, filename: true, status: true }
          }
        }
      });

      return res.status(200).json(ApiResponse.success(sessions, 'Chat sessions retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get document focus for a specific chat session
   */
  static async getSessionFocus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;

      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: {
          focusedDocument: {
            select: { id: true, filename: true, status: true }
          }
        }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      return res.status(200).json(ApiResponse.success({
        focusedDocumentId: session.focusedDocumentId,
        focusedDocument: session.focusedDocument
      }, 'Session focus retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update document focus for a chat session (PATCH /sessions/:sessionId/focus)
   */
  static async updateSessionFocus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const { documentId } = req.body; // string | null

      // 1. Verify session ownership
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      let validDocumentId: string | null = null;

      // 2. If a documentId is provided, verify ownership and READY status
      if (documentId) {
        const doc = await prisma.document.findFirst({
          where: { id: documentId, userId }
        });

        if (!doc) {
          return res.status(404).json(ApiResponse.error('Document not found or does not belong to user', 'NOT_FOUND'));
        }

        if (doc.status !== 'READY') {
          return res.status(400).json(ApiResponse.error('Selected document is not ready for study focus', 'BAD_REQUEST'));
        }

        validDocumentId = doc.id;
      }

      // 3. Update session focus
      const updatedSession = await prisma.chatSession.update({
        where: { id: sessionId },
        data: { focusedDocumentId: validDocumentId },
        include: {
          focusedDocument: {
            select: { id: true, filename: true, status: true }
          }
        }
      });

      return res.status(200).json(ApiResponse.success({
        focusedDocumentId: updatedSession.focusedDocumentId,
        focusedDocument: updatedSession.focusedDocument
      }, 'Session focus updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mentor mode for a specific chat session (GET /sessions/:sessionId/mode)
   */
  static async getSessionMode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;

      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      const availableModes = ['EXPLAIN', 'SOCRATIC', 'EXAM', 'VIVA', 'DOUBT', 'STUDY'];

      return res.status(200).json(ApiResponse.success({
        mentorMode: session.mentorMode,
        availableModes
      }, 'Session mentor mode retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update mentor mode for a chat session (PATCH /sessions/:sessionId/mode)
   */
  static async updateSessionMode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const { mode } = req.body;

      const validModes = ['EXPLAIN', 'SOCRATIC', 'EXAM', 'VIVA', 'DOUBT', 'STUDY'];

      if (!mode || !validModes.includes(mode)) {
        return res.status(400).json(ApiResponse.error(`Invalid mentor mode. Must be one of: ${validModes.join(', ')}`, 'BAD_REQUEST'));
      }

      // Verify session ownership
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      const updatedSession = await prisma.chatSession.update({
        where: { id: sessionId },
        data: { mentorMode: mode as any }
      });

      return res.status(200).json(ApiResponse.success({
        mentorMode: updatedSession.mentorMode,
        availableModes: validModes
      }, 'Session mentor mode updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new chat session
   */
  static async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { title } = req.body;
      
      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: title || 'New Chat'
        }
      });

      return res.status(201).json(ApiResponse.success(session, 'Chat session created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for a specific chat session
   */
  static async getSessionMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      
      // Verify session belongs to user
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      });

      return res.status(200).json(ApiResponse.success(messages, 'Messages retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a user message and stream the AI assistant response
   */
  static async streamMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const { content, studyMode } = req.body;
      
      if (!content) {
        return res.status(400).json(ApiResponse.error('Message content is required', 'BAD_REQUEST'));
      }

      // Verify session belongs to user
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      // Delegate to ChatService which handles SSE and persistence
      await ChatService.streamChatResponse(userId, sessionId, content, studyMode || null, req, res);

    } catch (error) {
      // If we haven't started streaming, we can use next(error).
      // If headers are already sent, SSE stream error should be sent by service.
      if (!res.headersSent) {
        next(error);
      } else {
        console.error('Error during streaming:', error);
        res.end();
      }
    }
  }

  /**
   * Add a user message to a chat session (Non-AI placeholder version)
   */
  static async addUserMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const { content, studyMode } = req.body;
      
      if (!content) {
        return res.status(400).json(ApiResponse.error('Message content is required', 'BAD_REQUEST'));
      }

      // Verify session belongs to user
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      });

      if (!session) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'USER',
          content,
          studyMode: studyMode || null
        }
      });

      // Update session updatedAt timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      });

      return res.status(201).json(ApiResponse.success(message, 'Message added successfully'));
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a chat session
   */
  static async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      
      // Delete session only if it belongs to user
      const deleted = await prisma.chatSession.deleteMany({
        where: { id: sessionId, userId }
      });

      if (deleted.count === 0) {
        return res.status(404).json(ApiResponse.error('Chat session not found', 'NOT_FOUND'));
      }

      return res.status(200).json(ApiResponse.success(null, 'Session deleted successfully'));
    } catch (error) {
      next(error);
    }
  }
}
