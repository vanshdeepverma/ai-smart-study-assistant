import { prisma } from '../utils/db';
import { AIProvider, ChatMessageInput } from './ai/AIProvider.interface';
import { GeminiProvider } from './ai/GeminiProvider';
import { buildRAGPrompt } from './prompts';
import { RAGService, RAGContext } from './rag.service';
import { LearningMemoryService } from './learningMemory.service';
import { WeaknessDetectionService, FormattedWeakness } from './weaknessDetection.service';
import { Request, Response } from 'express';
import { LearningMemory } from '@prisma/client';

// Simple factory or singleton for provider
let aiProvider: AIProvider | null = null;

export const setAIProvider = (provider: AIProvider) => {
  aiProvider = provider;
};

export const getAIProvider = (): AIProvider => {
  if (!aiProvider) {
    aiProvider = new GeminiProvider();
    aiProvider.initialize();
  }
  return aiProvider;
};

export class ChatService {
  /**
   * Process a new user message, perform RAG retrieval, stream AI response, and save assistant reply + citations.
   */
  static async streamChatResponse(
    userId: string,
    sessionId: string,
    content: string,
    studyMode: string | null,
    req: Request,
    res: Response
  ) {
    // 1b. Check Session Document Focus & Active Mentor Mode
    const currentSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        focusedDocument: {
          select: { id: true, filename: true, status: true }
        }
      }
    });

    const activeMode = studyMode || currentSession?.mentorMode || 'EXPLAIN';
    const focusedDocumentId = currentSession?.focusedDocument?.status === 'READY' ? currentSession.focusedDocumentId : null;
    const focusedDocumentName = currentSession?.focusedDocument?.status === 'READY' ? currentSession.focusedDocument?.filename : null;

    // 1. Save User's Message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content,
        studyMode: activeMode
      }
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    // 2. Perform RAG Vector Search scoped to this user and optional focused document
    let retrievedChunks: RAGContext[] = [];
    try {
      const chunks = await RAGService.findSimilarChunks(userId, content, 5, focusedDocumentId);
      // Filter out low similarity matches to strictly ground the AI (0.76 for strict document boundary)
      retrievedChunks = chunks.filter(c => c.similarity >= 0.76);
    } catch (ragError) {
      console.warn('[ChatService] RAG retrieval failed, falling back to basic prompt:', ragError);
    }

    // 2b. Retrieve Active Relevant Learning Memories for this student
    let activeMemories: LearningMemory[] = [];
    try {
      activeMemories = await LearningMemoryService.findRelevantMemoriesForQuery(userId, content);
    } catch (memError) {
      console.warn('[ChatService] Memory retrieval failed, skipping memory context:', memError);
    }

    // 2c. Retrieve Student Topic Weaknesses
    let weaknesses: FormattedWeakness[] = [];
    try {
      weaknesses = await WeaknessDetectionService.getUserWeaknesses(userId);
    } catch (weakErr) {
      console.warn('[ChatService] Weakness retrieval failed, skipping weakness context:', weakErr);
    }

    // 3. Get user history (bounded to last 20 messages)
    let history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Reverse it back to chronological order
    history = history.reverse();

    // 4. Construct RAG, Memory, & Weakness Grounded System Prompt
    const systemInstruction = buildRAGPrompt(retrievedChunks, activeMode, activeMemories, focusedDocumentName, weaknesses);

    // Convert to AIProvider format
    const historyInput: ChatMessageInput[] = history.map(h => ({
      role: h.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
      content: h.content
    }));

    // 5. Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // --- AI SHORT-CIRCUIT / FAST-PATH FALLBACK ---
    if (retrievedChunks.length === 0) {
      const fallbackMessage = focusedDocumentName 
        ? `📄 This topic isn't covered in ${focusedDocumentName}.\n\nI couldn't find enough information about this topic in the selected document.\n\nTry asking something related to this document or select another study source.`
        : `📚 I couldn't find this topic in your uploaded study materials.\n\nTry asking something related to your study material or select another document.`;
      
      res.write(`event: token\ndata: ${JSON.stringify({ chunk: fallbackMessage })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Persist the fallback response as ASSISTANT message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: fallbackMessage,
          studyMode: activeMode,
          citations: []
        }
      });
      return;
    }

    // 6. Invoke AI Provider
    const provider = getAIProvider();
    
    let isClientConnected = true;
    req.on('close', () => {
      isClientConnected = false;
    });

    let fullAssistantResponse = "";

    try {
      const stream = provider.streamChat(historyInput, systemInstruction);

      for await (const chunk of stream) {
        if (!isClientConnected) {
          console.log(`[ChatService] Client disconnected, aborting stream for session ${sessionId}`);
          break;
        }

        fullAssistantResponse += chunk;
        
        // SSE format explicitly uses named events
        res.write(`event: token\ndata: ${JSON.stringify({ chunk })}\n\n`);
        const flushableRes = res as Response & { flush?: () => void };
        if (typeof flushableRes.flush === 'function') {
          flushableRes.flush();
        }
      }
    } catch (error: unknown) {
      console.error('[ChatService] Stream error:', error);
      let errorMsg = 'Failed to generate response';
      if (error instanceof Error && error.message === 'AI_QUOTA_EXCEEDED') {
        errorMsg = 'AI usage limit reached. Please try again later or configure another Gemini API key/project.';
      } else if (error instanceof Error && error.message === 'AI_PROVIDER_ERROR') {
        errorMsg = 'AI Provider encountered an error. Please try again later.';
      }
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
    } finally {
      // Send end event
      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // 7. Persist final Assistant Message with Citations JSON
      if (fullAssistantResponse.trim().length > 0) {
        const citationsData = retrievedChunks.map(c => ({
          documentId: c.documentId,
          filename: c.filename,
          pageNumber: c.pageNumber,
          similarity: c.similarity
        }));

        await prisma.chatMessage.create({
          data: {
            sessionId,
            role: 'ASSISTANT',
            content: fullAssistantResponse,
            studyMode: activeMode,
            citations: citationsData
          }
        });

        // 8. Asynchronously analyze interaction for new durable learning memories
        LearningMemoryService.extractMemoriesFromInteraction(userId, content, fullAssistantResponse)
          .catch(err => console.warn('[ChatService] Background memory extraction error:', err));
      }
    }
  }
}
