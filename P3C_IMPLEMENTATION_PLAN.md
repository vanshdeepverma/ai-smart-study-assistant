# P3-C Implementation Plan: Document-Focused AI Mentor / RAG Chat

## Executive Summary
Phase **P3-C (Document-Focused AI Mentor / RAG Chat)** empowers students to specify a primary study document focus for any chat session. When a student selects a specific study material (e.g., `Computer Networks.pdf`), the AI Mentor restricts vector similarity search strictly to chunks from that document, while preserving all P3-B Learning Memory personalization.

---

## 1. Current Architecture vs Proposed P3-C Architecture

### Current RAG Architecture
- **Document Chunking & Embeddings:** Documents are split into text chunks and embedded into 768-dim vectors using `gemini-embedding-001`.
- **Vector Search (`RAGService.findSimilarChunks`):** Queries pgvector `DocumentChunk` records matching `d."userId" = ${userId}` and `d.status = 'READY'`. Currently searches across **all** ready documents belonging to the user.
- **Chat Session (`ChatSession`):** Stores `id`, `userId`, `title`, `createdAt`, `updatedAt`, and messages. Does not currently track document focus selection.
- **Prompt Construction (`prompts.ts`):** Merges system prompt, study mode (`EXPLAIN`/`EXAM`/`VIVA`), active P3-B learning memories, retrieved RAG context chunks, and user query.

### Proposed P3-C Architecture
1. **Schema Extension (`ChatSession`):**
   - Add `focusedDocumentId String?` (nullable UUID) referencing `Document.id` with `onDelete: SetNull`.
   - `null` represents `ALL_DOCUMENTS` (default behavior).
   - If a selected document is deleted, database automatically sets `focusedDocumentId = null` (reverting gracefully to `ALL_DOCUMENTS`).
2. **Database-Level Vector Filtering (`RAGService.findSimilarChunks`):**
   - Extend signature: `findSimilarChunks(userId: string, queryText: string, limit = 5, documentId?: string | null)`.
   - When `documentId` is provided, append `AND d.id = ${documentId}` to the pgvector SQL query.
   - Filtering occurs **inside PostgreSQL** during vector search, not post-query in JavaScript.
3. **Strict Security Isolation:**
   - `PATCH /api/v1/chat/sessions/:sessionId/focus` verifies:
     - Session belongs to `req.user.id`.
     - Selected `documentId` belongs to `req.user.id` and has `status = 'READY'`.
   - If `documentId` belongs to another user or is invalid, the API rejects with `404 / 400`.
4. **Combined Prompt Grounding & Memory Personalization:**
   - Combines:
     1. AI Mentor Identity
     2. Student Learning Profile & Preferences
     3. Active P3-B Learning Memories
     4. Focused Document Instruction (e.g. `Mentoring from: Computer Networks.pdf`)
     5. Retrieved Document Context Chunks
     6. Student Query

---

## 2. Detailed Technical Plan

### A. Database Changes (`prisma/schema.prisma`)
```prisma
model ChatSession {
  id                String    @id @default(uuid())
  userId            String
  title             String    @default("New Chat")
  focusedDocumentId String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  focusedDocument Document?     @relation(fields: [focusedDocumentId], references: [id], onDelete: SetNull)
  messages        ChatMessage[]
}
```
- **Migration Strategy:** Execute `npx prisma db push && npx prisma generate`.
- **Backward Compatibility:** All existing chat sessions remain untouched with `focusedDocumentId = null` (`ALL_DOCUMENTS`).

### B. Backend Changes

#### 1. REST APIs (`chat.controller.ts` & `chat.routes.ts`)
- `GET /api/v1/chat/sessions/:sessionId/focus`
  - Returns `{ focusedDocumentId, focusedDocument: { id, filename, status } }`.
- `PATCH /api/v1/chat/sessions/:sessionId/focus`
  - Body: `{ documentId: string | null }`.
  - Validates `userId` ownership on both session and document.
  - Updates `focusedDocumentId` on `ChatSession`.

#### 2. RAG Retrieval (`rag.service.ts`)
- Update `findSimilarChunks` to accept optional `documentId`.
- Includes pgvector SQL clause `${documentId ? Prisma.sql`AND d.id = ${documentId}` : Prisma.empty}`.

#### 3. Chat Service (`chat.service.ts` & `prompts.ts`)
- `ChatService.streamChatResponse`: Fetches `session.focusedDocumentId` and passes it to `RAGService.findSimilarChunks(userId, content, 5, session.focusedDocumentId)`.
- `prompts.ts`: Updates `buildRAGPrompt` to include `focusedDocumentName` in mentor system instructions when single-document focus is active.

### C. Frontend Changes

#### 1. React Hook (`useDocumentFocus.ts`)
- `useDocumentFocus(sessionId)`: Uses React Query to fetch and patch session document focus.

#### 2. Chat UI Selector (`Chat.tsx`)
- Header/sub-header controls in `Chat.tsx`:
  - Selector dropdown: `📚 All Study Material` (default) and list of user's `READY` documents `📄 <filename>`.
  - Dynamic status indicator: `Mentoring from: 📄 Computer Networks.pdf`.
  - Focus selection persists across page refreshes and session switching.

---

## 3. Verification & Testing Strategy

### A. Automated Backend Test Suite (`tests/documentFocus.test.ts`)
1. Unauthenticated focus update returns 401.
2. Setting valid document focus updates session.
3. Setting null focus reverts to `ALL_DOCUMENTS`.
4. Attempting to select non-existent document returns 400/404.
5. Attempting to select another user's document returns 404 (Security check).
6. Attempting to update another user's session returns 404.
7. RAG search with `documentId` returns chunks ONLY from that document.
8. Filtered RAG search NEVER leaks chunks from another document.
9. Deleting a focused document automatically sets session focus to null.

### B. Full Suite & Build Verification
- Execute `npm test` across all Jest test suites.
- Execute `npx tsc --noEmit` and `npm run build` in `frontend/`.

### C. Real-Browser E2E Verification (`e2e-p3c-document-focus.js`)
1. Register Student A.
2. Upload PDF document (`sample_networks.pdf`).
3. Open Chat and verify default selector is `📚 All Study Material`.
4. Change selector to `📄 sample_networks.pdf`.
5. Ask `"Explain TCP flow control"`. Verify AI streaming response.
6. Refresh page and verify document focus remains selected.
7. Register Student B and verify Student B cannot see or select Student A's document.

---

## 4. Confirmation of Non-Destructive Principles
- No existing chats, documents, or memories will be deleted or reset.
- P3-B Learning Memory System remains 100% active and integrated.
- Standard default behavior remains `ALL_DOCUMENTS`.
