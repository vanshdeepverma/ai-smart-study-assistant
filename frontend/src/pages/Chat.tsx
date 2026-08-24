import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrainCircuit, Send, Paperclip, Loader2, User, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useDocuments } from "@/hooks/useDocuments";
import { useDocumentFocus, useUpdateDocumentFocus } from "@/hooks/useDocumentFocus";
import { useMentorMode, useUpdateMentorMode, type MentorModeType } from "@/hooks/useMentorMode";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const { messages, isStreaming, streamingContent, sendMessage, error } = useStreamingChat(sessionId);
  
  const { data: documents } = useDocuments();
  const readyDocuments = documents ? documents.filter(d => d.status === 'READY') : [];
  const { data: focusData } = useDocumentFocus(sessionId);
  const updateFocusMutation = useUpdateDocumentFocus(sessionId);

  const { data: modeData } = useMentorMode(sessionId);
  const updateModeMutation = useUpdateMentorMode(sessionId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming || isCreatingSession) return;
    
    const contentToSend = message;
    setMessage("");

    // If no session exists, create one first
    if (!sessionId) {
      setIsCreatingSession(true);
      try {
        const response = await apiFetch('/chat/sessions', {
          method: 'POST',
          body: JSON.stringify({ title: contentToSend.substring(0, 30) + '...' })
        });
        const newSessionId = response.data.id;
        queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        navigate(`/chat/${newSessionId}`, { replace: true });
      } catch (err) {
        console.error('Failed to create session:', err);
      } finally {
        setIsCreatingSession(false);
      }
      return;
    }

    sendMessage(contentToSend);
  };

  const getModeBadge = (mode?: string) => {
    switch (mode) {
      case 'SOCRATIC': return '🧠 Socratic';
      case 'EXAM': return '📝 Exam Prep';
      case 'VIVA': return '🎤 Viva Voce';
      case 'DOUBT': return '🔍 Doubt Solver';
      case 'STUDY': return '📚 Study Session';
      default: return '🧑🏫 Explain';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-background rounded-lg border shadow-sm">
      {/* Top Header Bar: Document Focus & Mentor Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2.5 border-b bg-card gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <span>AI Study Mentor</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
            Mentor Mode: {getModeBadge(modeData?.mentorMode)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            Source: {focusData?.focusedDocument ? `📄 ${focusData.focusedDocument.filename}` : "📚 All Study Material"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mentor Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Mode:</span>
            <select
              value={modeData?.mentorMode || 'EXPLAIN'}
              onChange={(e) => {
                const val = e.target.value as MentorModeType;
                if (sessionId) {
                  updateModeMutation.mutate(val);
                }
              }}
              disabled={!sessionId || updateModeMutation.isPending}
              className="text-xs font-medium bg-background border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary cursor-pointer truncate"
            >
              <option value="EXPLAIN">🧑🏫 Explain (Concept Master)</option>
              <option value="SOCRATIC">🧠 Socratic (Guided Reasoning)</option>
              <option value="EXAM">📝 Exam Prep (High-Yield Revision)</option>
              <option value="VIVA">🎤 Viva Voce (Oral Examiner)</option>
              <option value="DOUBT">🔍 Doubt Solver (Misconception Diagnosis)</option>
              <option value="STUDY">📚 Study Session (4-Phase Lesson)</option>
            </select>
          </div>

          {/* Study Source Focus Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Source:</span>
            <select
              value={focusData?.focusedDocumentId || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                if (sessionId) {
                  updateFocusMutation.mutate(val);
                }
              }}
              disabled={!sessionId || updateFocusMutation.isPending}
              className="text-xs font-medium bg-background border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary cursor-pointer max-w-[180px] truncate"
            >
              <option value="">📚 All Study Material</option>
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  📄 {doc.filename}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {!sessionId || (messages.length === 0 && !isStreaming) ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BrainCircuit className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">How can I help you study today?</h2>
            <p className="text-muted-foreground text-center max-w-md">
              I am your personalized AI Study Mentor. Select your study material above or ask me any question.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            {messages.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                className={`flex gap-4 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'USER' && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div 
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === 'USER' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted prose prose-sm dark:prose-invert max-w-none'
                  }`}
                >
                  {msg.role === 'USER' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-primary">📄 Sources:</span>
                          {msg.citations.map((c, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-background border font-medium">
                              {c.filename} {c.pageNumber ? `(p. ${c.pageNumber})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {msg.role === 'USER' && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Message Placeholder */}
            {isStreaming && (
              <div className="flex gap-4 justify-start">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-xl px-4 py-3 bg-muted prose prose-sm dark:prose-invert max-w-none">
                  {streamingContent ? (
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground h-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
                <RefreshCw className="h-5 w-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="absolute left-2 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input 
            className="w-full pl-12 pr-12 py-6 rounded-full border-muted bg-background focus-visible:ring-1 text-base shadow-sm"
            placeholder={isCreatingSession ? "Creating chat..." : "Message AI Assistant..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isStreaming || isCreatingSession}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2 rounded-full h-9 w-9 bg-primary hover:bg-primary/90"
            disabled={!message.trim() || isStreaming || isCreatingSession}
          >
            {isCreatingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-3">
          AI can make mistakes. Verify important information with your study material.
        </p>
      </div>
    </div>
  );
}
