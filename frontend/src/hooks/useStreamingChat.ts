import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  studyMode?: string;
  citations?: Array<{ documentId: string; filename: string; pageNumber?: number; similarity?: number }>;
  createdAt?: string;
}

export function useStreamingChat(sessionId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load existing messages when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await apiFetch(`/chat/sessions/${sessionId}/messages`);
        setMessages(response.data);
      } catch (err) {
        console.error('Failed to load messages', err);
        setError('Failed to load chat history');
      }
    };
    
    loadMessages();
  }, [sessionId]);

  const sendMessage = async (content: string, studyMode?: string) => {
    if (!sessionId || !content.trim()) return;

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content,
      studyMode
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content, studyMode })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not yet supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let finalContent = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let eolIndex;
          while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
            const message = buffer.slice(0, eolIndex);
            buffer = buffer.slice(eolIndex + 2);
            
            const lines = message.split('\n');
            let currentEvent = 'message';
            
            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEvent = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                const dataStr = line.replace('data:', '').trim();
                if (!dataStr) continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (currentEvent === 'error' || data.error) {
                    setError(data.error || 'An error occurred');
                    done = true;
                  } else if (currentEvent === 'token' || data.chunk) {
                    finalContent += (data.chunk || '');
                    setStreamingContent(finalContent);
                  } else if (currentEvent === 'done' || data.done) {
                    done = true;
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk', e);
                }
              }
            }
          }
        }
      }

      setIsStreaming(false);
      setStreamingContent('');
      
      // Invalidate chat sessions and reload messages to get persisted citations
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      try {
        const reloadRes = await apiFetch(`/chat/sessions/${sessionId}/messages`);
        setMessages(reloadRes.data);
      } catch (err) {
        // Fallback: append temporary message
        if (finalContent) {
          const tempAssistantMessage: ChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            role: 'ASSISTANT',
            content: finalContent
          };
          setMessages((prev) => [...prev, tempAssistantMessage]);
        }
      }

    } catch (err: any) {
      console.error('Streaming error', err);
      setError(err.message || 'An error occurred during chat generation');
      setIsStreaming(false);
    }
  };

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    error
  };
}
