# P3-D Implementation Plan: Adaptive AI Mentor Modes & Pedagogical Engine

## Executive Summary
Phase **P3-D** transforms the system into a true **Adaptive AI Mentor**. Rather than simply answering user queries like a generic chatbot, the AI Mentor adapts its core pedagogical strategy based on six distinct **Mentor Modes** (`EXPLAIN`, `SOCRATIC`, `EXAM`, `VIVA`, `DOUBT`, `STUDY`).

P3-D seamlessly combines:
1. **Mentor Mode Pedagogical Directives** (Instructional strategy: step-by-step, Socratic guidance, exam readiness, viva oral evaluation, misconception diagnosis, or mini study sessions)
2. **P3-B Learning Memory System** (Adaptations based on student's past confusions & preferences)
3. **P3-C Document Focus & RAG Retrieval** (Strict grounding in selected study materials via pgvector)
4. **Conversation History & Context**

---

## 1. Current Architecture vs Proposed P3-D Architecture

### Current Architecture
- `ChatSession` stores `focusedDocumentId` (P3-C).
- System prompt in `prompts.ts` supports basic string `studyMode` checks (`EXPLAIN`, `EXAM`, `VIVA`).
- `ChatService` retrieves active P3-B memories and P3-C document RAG context.

### Proposed P3-D Architecture
1. **Prisma Schema (`ChatSession`):**
   - Add `mentorMode MentorMode @default(EXPLAIN)` enum field to `ChatSession` model.
   - Enum values: `EXPLAIN`, `SOCRATIC`, `EXAM`, `VIVA`, `DOUBT`, `STUDY`.
   - Migration: Non-destructive update via `npx prisma db push && npx prisma generate`. All existing sessions default to `EXPLAIN`.
2. **REST APIs for Mentor Mode (`chat.controller.ts` & `chat.routes.ts`):**
   - `GET /api/v1/chat/sessions/:sessionId/mode`: Returns `{ mentorMode, availableModes }`.
   - `PATCH /api/v1/chat/sessions/:sessionId/mode`: Updates session `mentorMode` with security validation (`userId` ownership).
3. **Pedagogical Prompt Engine (`prompts.ts`):**
   - Refactor `getSystemPrompt` into a modular pedagogical prompt builder.
   - Dedicated behavioral prompt modules for each mode:
     - `EXPLAIN`: Simple language $\rightarrow$ Analogy $\rightarrow$ Technical explanation $\rightarrow$ Short example $\rightarrow$ Check understanding question.
     - `SOCRATIC`: Guiding questions, progressive hints, step-by-step discovery, no immediate answer dump.
     - `EXAM`: Key concepts, definitions, formulas, "Exam Tip" callout, common traps, quick practice MCQ.
     - `VIVA`: One oral exam question at a time, evaluate student answer, give concise feedback, adapt difficulty.
     - `DOUBT`: Identify root misconception, contrast similar concepts, resolve confusion using Learning Memories.
     - `STUDY`: Interactive 4-step mini learning session (Concept $\rightarrow$ Example $\rightarrow$ Check $\rightarrow$ Practice task).
4. **Frontend Mentor Mode Selector (`useMentorMode.ts`, `Chat.tsx`):**
   - Add `useMentorMode(sessionId)` hook for fetching and updating session mode.
   - Add Mentor Mode Selector dropdown alongside the P3-C Document Focus selector in `Chat.tsx` header with icons and short tooltips.
   - Selection persists across page refreshes and session switching.
   - Mode switching does not alter history or recreate chat sessions.

---

## 2. Detailed Technical Plan

### A. Database Changes (`prisma/schema.prisma`)
```prisma
enum MentorMode {
  EXPLAIN
  SOCRATIC
  EXAM
  VIVA
  DOUBT
  STUDY
}

model ChatSession {
  id                String      @id @default(uuid())
  userId            String
  title             String      @default("New Chat")
  focusedDocumentId String?
  mentorMode        MentorMode  @default(EXPLAIN)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  focusedDocument Document?     @relation(fields: [focusedDocumentId], references: [id], onDelete: SetNull)
  messages        ChatMessage[]
}
```

### B. Backend Changes

#### 1. REST API Controllers & Routes (`chat.controller.ts` & `chat.routes.ts`)
- `GET /api/v1/chat/sessions/:sessionId/mode`
  - Verifies session belongs to `req.user.id`.
  - Returns `{ mentorMode: session.mentorMode, availableModes: Object.values(MentorMode) }`.
- `PATCH /api/v1/chat/sessions/:sessionId/mode`
  - Body: `{ mode: 'SOCRATIC' }`.
  - Validates `mode` is a valid `MentorMode` enum value.
  - Updates `ChatSession.mentorMode`.

#### 2. RAG & Chat Service Integration (`chat.service.ts`)
- In `streamChatResponse`:
  - Fetch `session.mentorMode`.
  - Pass active `mentorMode` to `buildRAGPrompt`.
  - Save `mentorMode` on created `ChatMessage` records.

#### 3. Pedagogical Prompt Engine (`prompts.ts`)
- Build mode-specific prompt templates enforcing explicit structural output formats.
- Retain all P3-B Learning Memories and P3-C Document Focus instructions.

### C. Frontend Changes

#### 1. React Hook (`useMentorMode.ts`)
- `useMentorMode(sessionId)`: React Query hook for GET and PATCH `/chat/sessions/:sessionId/mode`.

#### 2. Chat UI Selector (`Chat.tsx`)
- Header selector for Mentor Mode:
  - 🧑🏫 Explain ("Learn concepts clearly")
  - 🧠 Socratic ("Learn by reasoning")
  - 📝 Exam Prep ("Prepare for tests")
  - 🎤 Viva ("Practice oral interview")
  - 🔍 Doubt Solver ("Fix confusing concepts")
  - 📚 Study Session ("Step-by-step study")
- Dynamic header indicator showing active mode and active document focus.

---

## 3. Verification & Testing Strategy

### A. Automated Backend Test Suite (`tests/mentorMode.test.ts`)
1. Unauthenticated mode access returns 401.
2. Updating mode on another user's session returns 404.
3. Updating mode to invalid string returns 400.
4. Valid mode update updates session in database.
5. Existing sessions default to `EXPLAIN`.
6. Prompt generator produces mode-specific instructions for `EXPLAIN`, `SOCRATIC`, `EXAM`, `VIVA`, `DOUBT`, `STUDY`.
7. P3-B Learning Memories still present in generated prompts.
8. P3-C Document Focus still present in generated prompts.

### B. Full Suite & Build Verification
- Execute `npm test` across all Jest test suites.
- Execute `npx tsc --noEmit` and `npm run build` in `frontend/`.

### C. Real-Browser E2E Test (`/tmp/puppeteer-test/e2e-p3d-mentor-modes.js`)
1. Register Student A.
2. Open Chat, verify default mode is `EXPLAIN`.
3. Switch mode to `SOCRATIC`, reload page, verify `SOCRATIC` persists.
4. Switch mode to `EXAM`, send message `"Explain TCP vs UDP"`, verify streaming response.
5. Switch mode to `VIVA`, `DOUBT`, `STUDY`, verify responses and mode persistence.
6. Verify multi-tenant isolation (Student B cannot access or change Student A's mode/session).

---

## 4. Confirmation of Non-Destructive Principles
- No existing chats, messages, documents, or learning memories deleted.
- Existing sessions remain valid with `mentorMode = EXPLAIN`.
- P3-B Learning Memory system and P3-C Document Focus system remain 100% active and integrated.
