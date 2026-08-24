# Phase P3 Implementation Plan: AI Mentor Engine & Continuous Learning Loop

## Executive Summary & Product Vision

### Transition: AI Study Assistant → AI Study Mentor
The core vision of Phase P3 is to elevate the platform from a standard, transactional Q&A chatbot (like generic ChatGPT/Gemini interfaces) into an **Intelligent AI Study Mentor** built around a persistent, continuous **Learning Loop**.

```
                           ┌──────────────────────────┐
                           │      Student Input       │
                           │  (Ask / Study Document)  │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │     AI Mentor Engine     │
                           │ (Profile + Memory + RAG) │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │ Explain Concept & Check  │
                           │   Understanding (Mode)   │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │ Detect Learning Weakness │
                           │   & Update Mastery DB    │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │ Generate Personalized    │
                           │ Study Recommendations    │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │ Student Practices &      │
                           │ Continues Learning Loop  │
                           └──────────────────────────┘
```

### Core Product Differentiators
| Feature | Generic Chatbot (ChatGPT / Gemini) | Our AI Study Mentor |
|---|---|---|
| **Context Scope** | Session-bound; forgets past quiz performance & mistakes | Persistent across sessions via Student Profile & Learning Memory |
| **Pedagogy** | Transactional Q&A (Answers immediately) | Pedagogical modes (Socratic guidance, Diagnostic Doubt resolution, Exam prep) |
| **Document Integration** | Generic attachment upload | Deep RAG grounded in user's PDF notes with citations & mastery linking |
| **Assessment & Feedback** | None | Checks understanding with follow-up diagnostic questions after explanations |
| **Weakness Tracking** | None | Evidence-based topic mastery scoring (`WEAK`, `NEEDS_PRACTICE`, `GOOD`, `STRONG`) |
| **Actionable Guidance** | "Study harder" | "Your CSMA/CD mastery is 35%. Take a 5-minute quiz on Ethernet notes." |

---

## 1. Scope & Categorization (Must Have vs. Postponed)

To establish a solid, production-grade foundation without architectural bloat, Phase P3 features are strictly prioritized:

### MUST HAVE (P3 Mentor Core Scope)
1. **Student Learning Profile Service & DB Schema:** Persistent profile tracking subjects, topics, aggregate study stats, and mastery metrics.
2. **Learning Memory Service & DB Schema:** Extracted learning memories (`CONCEPT_CONFUSION`, `REPEATED_MISTAKE`, `LEARNING_STRENGTH`) with confidence scoring and student deletion/management APIs.
3. **Mentor Modes Engine:** Real backend prompt & behavioral modes (`EXPLAIN`, `SOCRATIC`, `EXAM`, `DOUBT`, `STUDY`) selectable from the Chat UI.
4. **Weakness Detection System:** Evidence aggregator synthesizing Quiz results (`QuizAttempt` + `Answer`) and Chat diagnostic responses into `TopicPerformance` mastery levels (`0.0` - `1.0`).
5. **Personalized Recommendation Engine:** Data-driven recommendation cards based on actual topic weaknesses and document availability.
6. **Document-Aware Mentor Integration:** Multi-layered prompt assembly combining Learning Profile + Memories + Weakness Data + RAG Documents + Active Mode.
7. **Enhanced Mentor UI & Math/Code Support:** KaTeX math rendering, syntax-highlighted code blocks, Mentor Mode Selector, Memory Inspector, and Topic Mastery dashboard widget.

### SHOULD HAVE / POSTPONED (Sub-Phases after Mentor Core)
- **AI Flashcards & Spaced Repetition (SRS):** Anki-style Leitner/SM-2 algorithm consuming weakness data.
- **Auto-Generated Study Plans:** Dynamic calendar scheduling based on target exam dates.
- **Gamification UI:** XP, Leveling, Badges, and Streaks visualization.

### FUTURE (Post-P3 / Advanced Expansion)
- Audio Viva/Oral Exam Mode via WebRTC Voice AI.
- Multi-document cross-synthesis knowledge graph.

---

## 2. Technical Architecture & Component Design

### Target Architecture Diagram
```
                             ┌────────────────────────┐
                             │    React Frontend UI   │
                             │ (Chat / Dashboard UI)  │
                             └───────────┬────────────┘
                                         │ HTTP / SSE
                                         ▼
                             ┌────────────────────────┐
                             │  Express Controller &  │
                             │    Auth Middleware     │
                             └───────────┬────────────┘
                                         │
                                         ▼
                             ┌────────────────────────┐
                             │     MentorService      │
                             │ (Core Orchestrator)    │
                             └───────────┬────────────┘
                                         │
         ┌───────────────────┬───────────┼───────────┬───────────────────┐
         │                   │           │           │                   │
         ▼                   ▼           ▼           ▼                   ▼
┌─────────────────┐ ┌────────────────┐ ┌───────────┐ ┌──────────────┐ ┌─────────────┐
│ LearningProfile │ │ LearningMemory │ │ Weakness  │ │Recommendation│ │ RAGService  │
│     Service     │ │    Service     │ │ Detection │ │   Service    │ │ (pgvector)  │
└────────┬────────┘ └───────┬────────┘ └─────┬─────┘ └──────┬───────┘ └──────┬──────┘
         │                  │                │              │                │
         └──────────────────┴────────────────┴──────────────┴────────────────┘
                                         │
                                         ▼
                             ┌────────────────────────┐
                             │    GeminiProvider      │
                             │ (@google/genai SDK)    │
                             └────────────────────────┘
```

---

## 3. Detailed Subsystem Specifications

### Subsystem A: Learning Profile & Learning Memory
#### Memory Classification & Lifecycle
- **Categories:**
  - `CONCEPT_CONFUSION`: E.g., *"Confuses TCP congestion control with sliding window flow control."*
  - `REPEATED_MISTAKE`: E.g., *"Selects CSMA/CA instead of CSMA/CD for wired Ethernet questions."*
  - `LEARNING_STRENGTH`: E.g., *"Demonstrates strong understanding of OSI Layer 2 framing."*
  - `STUDY_PREFERENCE`: E.g., *"Prefers real-world network packet analogies over formal RFC definitions."*
- **What is NOT Remembered:** Raw message text, chit-chat greetings, passwords, off-topic questions.
- **Extraction & Confidence:** Asynchronous analyzer evaluates completed chat interactions and quiz attempts. Memories with confidence score $\ge 0.70$ are saved.
- **Decay & Resolution:** When a student achieves $>85\%$ score on a topic in 2 consecutive quizzes, associated `CONCEPT_CONFUSION` memories are marked `RESOLVED`.
- **Student Privacy & Control:** Full CRUD REST endpoints (`GET /api/v1/mentor/memories`, `DELETE /api/v1/mentor/memories/:id`) allow students to inspect and delete any memory.

### Subsystem B: Mentor Teaching Modes
1. **`EXPLAIN` (Default):** Step-by-step clear explanations with analogies. Ends with a 1-sentence understanding check question.
2. **`SOCRATIC`:** Never reveals direct answers immediately. Asks 1-2 guiding diagnostic questions to lead the student to discover the solution.
3. **`EXAM`:** Focuses on high-yield exam patterns, scoring rubrics, common trap options, and practice questions.
4. **`DOUBT`:** Diagnostic mode. Asks: *"Which specific part of X feels confusing: A) The mechanism, B) The packet header, or C) The purpose?"*
5. **`STUDY`:** Strictly grounded in uploaded PDF documents via RAG, citing document filenames and page numbers.

### Subsystem C: Weakness Detection Engine
- **Evidence Sources:**
  1. `QuizAttempt` + `Answer`: Exact objective percentage accuracy on topic questions.
  2. Chat Diagnostics: Diagnostic check questions answered in `SOCRATIC` or `EXPLAIN` mode.
- **Mastery Formula:**
  $$\text{Mastery Score} = 0.65 \times \text{QuizAccuracy} + 0.25 \times \text{DiagnosticAccuracy} + 0.10 \times \text{RecencyWeight}$$
- **Mastery Levels:**
  - `0.00 - 0.39`: `WEAK`
  - `0.40 - 0.64`: `NEEDS_PRACTICE`
  - `0.65 - 0.84`: `GOOD`
  - `0.85 - 1.00`: `STRONG`
- **Transparent Evidence Explanation:** The system generates plain-English justification for topic mastery status (e.g., *"CSMA/CD is marked WEAK because you scored 20% on CSMA/CD quiz questions and missed 2 diagnostic checks."*).

### Subsystem D: Personalized Recommendation Engine
- Scans `TopicPerformance` for topics in `WEAK` or `NEEDS_PRACTICE` status.
- Matches topics with uploaded `READY` documents.
- Produces actionable recommendation objects:
  - **Type:** `PRACTICE_QUIZ` | `REVISE_DOCUMENT` | `CONCEPT_CHECK`
  - **Reason:** *"Your mastery in CSMA/CD is 35%. Take a 5-question practice quiz based on sample_networks.pdf."*

---

## 4. Database Schema Changes (`prisma/schema.prisma`)

```prisma
// NEW ENUM FOR MENTOR MODES
enum MentorMode {
  EXPLAIN
  SOCRATIC
  EXAM
  DOUBT
  STUDY
}

// NEW ENUM FOR MEMORY TYPES
enum MemoryCategory {
  CONCEPT_CONFUSION
  REPEATED_MISTAKE
  LEARNING_STRENGTH
  STUDY_PREFERENCE
}

// NEW MODEL: Student Learning Profile
model LearningProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  preferredStyle  String   @default("ANALOGY") // ANALOGY | STEP_BY_STEP | FORMAL
  summary         String?  // AI-generated snapshot summary of student progress
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// NEW MODEL: Learning Memory
model LearningMemory {
  id             String         @id @default(uuid())
  userId         String
  topicName      String
  category       MemoryCategory
  content        String         // Plain English memory detail
  confidence     Float          @default(0.8) // 0.0 to 1.0
  isResolved     Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, topicName])
}

// UPDATE MODEL: TopicPerformance (Add explicit metrics)
// Enhances existing TopicPerformance model
model TopicPerformance {
  id              String   @id @default(uuid())
  userId          String
  topicId         String?
  topicName       String
  masteryLevel    Float    @default(0.0) // 0.0 to 1.0
  quizzesTaken    Int      @default(0)
  totalQuestions  Int      @default(0)
  correctAnswers  Int      @default(0)
  evidenceSummary String?  // Explanation of why this topic is marked weak/strong
  lastAssessedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, topicName])
}

// NEW MODEL: Personalized Recommendation
model Recommendation {
  id         String   @id @default(uuid())
  userId     String
  topicName  String
  title      String
  reason     String
  actionType String   // PRACTICE_QUIZ | REVISE_DOCUMENT | CONCEPT_CHECK
  targetId   String?  // Optional Document ID or Quiz ID
  isDismissed Boolean @default(false)
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// UPDATE MODEL: ChatMessage
// Add mentorMode to existing ChatMessage model
```

---

## 5. API Endpoint Specification

All endpoints require JWT HttpOnly cookie authentication (`requireAuth`) and scope data strictly to `req.user.id`.

### Mentor & Profile APIs
- `GET /api/v1/mentor/profile`: Fetch student learning profile, overall mastery statistics, and recent activity.
- `GET /api/v1/mentor/memories`: List active and resolved learning memories for the authenticated student.
- `DELETE /api/v1/mentor/memories/:id`: Delete/remove a learning memory.
- `GET /api/v1/mentor/weaknesses`: Fetch topic mastery breakdown (`WEAK`, `NEEDS_PRACTICE`, `GOOD`, `STRONG`) with evidence explanations.
- `GET /api/v1/mentor/recommendations`: Fetch active personalized study recommendations.
- `POST /api/v1/mentor/recommendations/:id/dismiss`: Dismiss a recommendation.

### Enhanced Streaming Chat API
- `POST /api/v1/chat/stream`:
  - Body: `{ sessionId, message, mentorMode: "EXPLAIN" | "SOCRATIC" | "EXAM" | "DOUBT" | "STUDY", documentId?: string }`
  - SSE Response: Streams tokens with citations, active mode metadata, and optional diagnostic check questions.

---

## 6. AI Prompt Architecture (5-Layer Mentor System Instruction)

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 1: BASE IDENTITY & PEDAGOGICAL GUIDELINES          │
│ "You are AI Study Mentor. You guide, check understanding, │
│  and teach concepts progressively."                      │
├──────────────────────────────────────────────────────────┤
│ LAYER 2: STUDENT PROFILE & ACTIVE LEARNING MEMORIES     │
│ "Student Memories:                                       │
│  - [CONCEPT_CONFUSION]: Confuses CSMA/CD with CSMA/CA    │
│  - [PREFERENCE]: Prefers visual packet flow analogies."  │
├──────────────────────────────────────────────────────────┤
│ LAYER 3: TOPIC MASTERY & WEAKNESS SNAPSHOT               │
│ "Weak Topics: Subnetting (35% mastery), CSMA/CD (40%).   │
│  Strong Topics: OSI Physical Layer (90% mastery)."       │
├──────────────────────────────────────────────────────────┤
│ LAYER 4: GROUNDED RAG DOCUMENT CONTEXT                   │
│ "[Source 1 - sample_networks.pdf]: CSMA/CD protocol..." │
├──────────────────────────────────────────────────────────┤
│ LAYER 5: ACTIVE MENTOR MODE DIRECTIVES                   │
│ "Active Mode: SOCRATIC. Do NOT give direct answer. Ask 1 │
│  diagnostic guiding question first."                     │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Security, Privacy & Multi-Tenancy

1. **User Isolation:** All DB queries for `LearningProfile`, `LearningMemory`, `TopicPerformance`, and `Recommendation` explicitly filter by `where: { userId: req.user.id }`.
2. **Prompt Injection Prevention:** User inputs are strictly delimited in system prompts to prevent students from overriding memory/mentor instructions.
3. **Privacy Compliance:** No personal PII is sent to Gemini beyond educational study content and topic confusion text.

---

## 8. Step-by-Step Implementation Roadmap

Execution will proceed incrementally in 4 sub-phases:

```
P3-A: Quiz System (Completed & Verified)
  ↓
P3-B: Mentor Core Data Layer & Services (Profile, Memory, Weakness DB, Recommendations)
  ↓
P3-C: AI Mentor Engine & Streaming Chat Integration (Modes, 5-Layer Prompt, RAG Integration)
  ↓
P3-D: Frontend Mentor UI (Mode Selector, Memory Inspector, KaTeX Math, Code Highlight, Dashboard Widget)
  ↓
P3-E: End-to-End Integration, Backend Test Suite, Real-Browser Puppeteer Verification
```

---

## 9. Verification & Testing Strategy

1. **Backend Integration & Unit Tests (`backend/tests/mentor.test.ts`):**
   - Verify Memory extraction, confidence filtering, and manual deletion APIs.
   - Verify Weakness calculation logic and topic mastery score updates.
   - Verify Multi-tenant isolation (User B cannot view or delete User A's learning memories or profile).
   - Verify Mentor Mode system instruction assembly.
2. **Frontend Type & Build Checks:**
   - Execute `npx tsc --noEmit` and `npm run build` with 0 TypeScript/Vite errors.
3. **Real-Browser Puppeteer E2E Verification (`/tmp/puppeteer-test/e2e-p3-mentor.js`):**
   - Register new user -> Upload PDF -> Switch Mentor Modes (`SOCRATIC`, `EXAM`) -> Ask question -> Verify streaming response -> Check diagnostic check question -> Inspect Memory Modal -> Verify Weakness Dashboard Widget.

---

## 10. Definition of Done for P3 Mentor Engine

- [ ] `LearningProfile`, `LearningMemory`, `TopicPerformance`, and `Recommendation` Prisma models applied cleanly.
- [ ] `LearningMemoryService`, `WeaknessDetectionService`, and `RecommendationService` implemented and tested.
- [ ] 5 Mentor Modes (`EXPLAIN`, `SOCRATIC`, `EXAM`, `DOUBT`, `STUDY`) functional in SSE streaming backend.
- [ ] Chat UI updated with Mode Selector, Memory Inspector, Topic Mastery widget, KaTeX math, and code formatting.
- [ ] All unit, security, build, and real-browser E2E verification tests passing cleanly.
