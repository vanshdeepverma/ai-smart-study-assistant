# Phase P3 Implementation Plan: Interactive AI Study Workflows & Student Chat Suite

Phase P3 transforms the AI Study Assistant from a document-aware RAG chat into a production-grade, student-specialized AI Study Platform.

---

## 1. Current Architecture After P2

- **Backend:** Node.js, Express, Prisma 7.9.1, PostgreSQL + `pgvector` v0.8.6.
- **AI & RAG:** Google Gemini (`gemini-3.6-flash` for chat streaming, `gemini-embedding-001` for 768-dim embeddings).
- **Authentication:** HttpOnly JWT cookies with role-based access control and user isolation.
- **Frontend:** React + Vite, Tailwind CSS, TanStack Query, Markdown rendering with citation badges.
- **Current State:** RAG chat and PDF document ingestion are 100% functional. However, the Quiz and Flashcard pages currently display placeholder banners (`NOT IMPLEMENTED (Requires Phase 6 AI Pipeline)`), and chat sessions lack document focus selection, auto-titling, and mathematical formula rendering.

---

## 2. What P3 Should Accomplish

1. **Document-Aware AI Quiz Generator & Player:**
   - Generate interactive 5-10 question multiple-choice quizzes from any uploaded `READY` document using Gemini structured JSON mode.
   - Interactive Quiz Taking UI: Answer questions, submit quiz, receive instant AI explanations for incorrect options, and track attempt scores in `QuizAttempt` and `Answer` database tables.
2. **AI Flashcard Generator & Spaced Repetition (SRS) Study Deck:**
   - Generate flashcard decks (key concept / front, detailed explanation / back) from uploaded documents using Gemini.
   - Interactive 3D flip-card study interface with Spaced Repetition System (SRS) rating buttons (*Easy*, *Good*, *Hard*) updating Leitner/SuperMemo factors (`easeFactor`, `nextReview`, `interval`).
3. **Conversational UX & Document Focus Mode:**
   - **Document Scope Selector:** Allow students to toggle between "All Documents" or target the Chat on a specific document (`documentId` scope in `RAGService`).
   - **Auto-Generate Chat Titles:** Automatically generate concise, context-aware titles for new chat sessions based on the student's initial prompt.
   - **Session Management:** Rename and delete chat sessions directly from the sidebar.
   - **KaTeX Math & Code Formatting:** Render mathematical notation (`$E = mc^2$`) and syntax-highlighted code blocks in chat messages using `remark-math` and `rehype-katex`.
4. **Remove All Technical Debt & Stubs:**
   - Replace all placeholder banners ("NOT IMPLEMENTED") with real AI-backed, database-persisted features.

---

## 3. User Experience We Are Trying to Achieve

A seamless student learning loop:
1. **Upload Notes:** Student uploads a PDF (e.g., `Computer_Networks_Unit_3.pdf`).
2. **Targeted Study Chat:** Student asks questions in Chat with "Focus on Computer Networks Unit 3" selected.
3. **Instant Self-Testing:** Student clicks "Generate Quiz" on the document -> Plays an interactive 5-question test with instant score breakdown and AI explanation for mistakes.
4. **Active Recall & Memorization:** Student clicks "Generate Flashcards" -> Studies 3D flip-cards with Spaced Repetition scheduling before exams.

---

## 4. Backend Changes

- `backend/src/services/ai/GeminiProvider.ts`:
  - Add `generateStructuredJson<T>(prompt: string, schema?: object): Promise<T>` using `@google/genai` structured JSON response capabilities.
- `backend/src/services/quiz.service.ts` (NEW):
  - `generateQuizFromDocument(userId: string, documentId: string, title?: string, difficulty?: QuizDifficulty)`
  - `getQuizzesForUser(userId: string)`
  - `getQuizById(userId: string, quizId: string)`
  - `submitQuizAttempt(userId: string, quizId: string, answers: Array<{ questionId: string; selectedOption: string }>)`
- `backend/src/services/flashcard.service.ts` (NEW):
  - `generateFlashcardsFromDocument(userId: string, documentId: string, count?: number)`
  - `getFlashcardsForUser(userId: string, documentId?: string)`
  - `reviewFlashcard(userId: string, flashcardId: string, rating: 'EASY' | 'GOOD' | 'HARD')` (Implements SuperMemo-2 SRS algorithm)
- `backend/src/services/rag.service.ts`:
  - Update `findSimilarChunks(userId: string, queryText: string, limit?: number, documentId?: string)` to accept an optional `documentId` filter.
- `backend/src/controllers/quiz.controller.ts` & `flashcard.controller.ts`:
  - Implement full request validation, ownership verification, and service delegation.
- `backend/src/controllers/chat.controller.ts`:
  - Add `updateSessionTitle` and `deleteSession` endpoints.
  - Integrate automatic session title generation on first message stream completion.

---

## 5. Frontend Changes

- `frontend/src/pages/Quiz.tsx`:
  - Replace stub with Quiz Library view, "Generate Quiz from Document" dialog, and interactive Quiz Player (question stepper, option selection, submit, instant AI score breakdown & explanation view).
- `frontend/src/pages/Flashcards.tsx`:
  - Replace stub with Flashcard Deck selector, 3D CSS flip-card interface, progress tracker, and SRS rating control bar (*Easy* / *Good* / *Hard*).
- `frontend/src/pages/Chat.tsx`:
  - Add Document Scope dropdown ("All Documents" vs specific PDF).
  - Add Study Mode selector pill ("EXPLAIN", "EXAM", "VIVA").
  - Integrate `remark-math`, `rehype-katex`, and `katex` CSS for rendering LaTeX equations.
- `frontend/src/components/layout/Sidebar.tsx`:
  - Add inline title editing and delete buttons for chat sessions.

---

## 6. Database / Schema Requirements

The PostgreSQL schema in `prisma/schema.prisma` **already defines** all required models (`Quiz`, `Question`, `QuizAttempt`, `Answer`, `Flashcard`, `FlashcardProgress`).  
No breaking database schema migrations are required!

---

## 7. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/quizzes/generate` | Generate quiz from document via Gemini |
| `GET` | `/api/v1/quizzes` | List all quizzes owned by authenticated user |
| `GET` | `/api/v1/quizzes/:id` | Get quiz questions & metadata |
| `POST` | `/api/v1/quizzes/:id/attempt` | Submit quiz attempt & return score + explanations |
| `POST` | `/api/v1/flashcards/generate` | Generate flashcards from document via Gemini |
| `GET` | `/api/v1/flashcards` | List flashcards / due SRS cards for user |
| `POST` | `/api/v1/flashcards/:id/review` | Submit SRS review rating (`EASY`, `GOOD`, `HARD`) |
| `PATCH` | `/api/v1/chat/sessions/:sessionId` | Update chat session title |
| `DELETE` | `/api/v1/chat/sessions/:sessionId` | Delete chat session |

---

## 8. AI Architecture Changes

- **Structured Output:** Leverage `@google/genai` JSON mode for generating strictly typed Quiz and Flashcard schemas.
- **Provider Abstraction:** Extend `AIProvider` interface to include `generateStructuredJson<T>(prompt: string): Promise<T>`.

---

## 9. Security Considerations

- **Strict Multi-Tenant Scoping:** Quiz generation, flashcard generation, quiz attempts, and SRS reviews MUST verify document and resource ownership against `authenticatedUserId`.
- **No Token Exposure:** All AI generation occurs server-side.
- **Document Focus Scoping:** If a user selects `documentId`, `RAGService` validates `WHERE d."id" = ${documentId} AND d."userId" = ${userId}`.

---

## 10. Error Handling

- **JSON Parse Protection:** Wrap Gemini JSON responses in robust validation. Fallback to clean regex JSON extractor if Gemini wraps response in markdown code blocks.
- **UI Error Alerts:** Display friendly toast notifications if document has insufficient text for quiz/flashcard generation.

---

## 11. Testing Strategy

- **Backend Unit & Integration Tests:**
  - `quiz.test.ts`: Quiz generation, ownership validation, attempt grading.
  - `flashcard.test.ts`: Flashcard generation, SRS SuperMemo-2 algorithm calculation.
  - `chat.manage.test.ts`: Chat session title update, deletion, document-scoped RAG filtering.
- **Full Test Suite Execution:** Run `npm test` ensuring all 8 existing test suites pass.

---

## 12. Real-Browser Verification Strategy

- Run automated Puppeteer E2E script on `http://localhost:5173`:
  1. Upload PDF -> Generate Quiz -> Answer questions -> Submit -> Verify score & explanations.
  2. Generate Flashcard deck -> Flip card -> Click *Easy* -> Verify `nextReview` date updated.
  3. Start Chat -> Select Document Focus -> Send prompt -> Verify RAG filters strictly to selected document.

---

## 13. What Must NOT Be Broken

- P0: Multi-tenant test isolation & auth cookies.
- P1: Real Gemini chat streaming & SSE protocol.
- P2: 768-dim `pgvector` similarity search, PDF text extraction, citations, and grounded system prompts.

---

## 14. Out of Scope for P3

- Voice recognition / Speech-to-text.
- Image OCR / Multimodal vision upload.
- Payment / Subscription limits.
- Multi-model routing outside Google Gemini.
- Cloud deployment.

---

## 15. Dependencies to Install

- `frontend`: `katex`, `remark-math`, `rehype-katex` (for rendering math formulas in Markdown).

---

## 16. Step-by-Step Implementation Order

1. **Step 1:** Add structured JSON helper to `GeminiProvider.ts`.
2. **Step 2:** Implement `QuizService`, `QuizController`, and `quiz.routes.ts`.
3. **Step 3:** Implement `FlashcardService`, `FlashcardController`, and `flashcard.routes.ts`.
4. **Step 4:** Enhance Chat Service (document scope filter, session auto-titling, rename, delete).
5. **Step 5:** Install frontend math libraries (`katex`, `remark-math`, `rehype-katex`).
6. **Step 6:** Update Frontend UI (`Quiz.tsx`, `Flashcards.tsx`, `Chat.tsx`, `Sidebar.tsx`).
7. **Step 7:** Write backend test suites and run `npm test`.
8. **Step 8:** Execute full real-browser E2E verification on `http://localhost:5173`.

---

## 17. Definition of Done

- Quizzes & Flashcards fully generated by Gemini and stored in PostgreSQL.
- Interactive Quiz player with AI explanations operational.
- Flashcard 3D flip viewer with Spaced Repetition working.
- Document focus selector functional in Chat UI.
- All "NOT IMPLEMENTED" placeholder badges removed.
- All backend tests passing (`npm test`).
- Frontend TypeScript/build passing (`npm run build`).
- E2E real-browser verification complete with zero console errors.
