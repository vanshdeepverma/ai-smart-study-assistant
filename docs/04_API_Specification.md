# API Specification

## Node.js Core API (Port 3000)

### Auth
* `POST /api/auth/register` - Create user
* `POST /api/auth/login` - Authenticate & return JWT
* `GET /api/auth/me` - Get current user profile

### Documents
* `POST /api/documents/upload` - Upload PDF (stores file metadata, forwards to Python API for processing)
* `GET /api/documents` - List user's documents
* `DELETE /api/documents/:id` - Delete document

### Quizzes & Progress
* `GET /api/analytics/dashboard` - Get study stats
* `GET /api/quizzes/history` - Get past scores

---

## Python AI API (Port 8000, Internal Only)

### Processing
* `POST /ai/process-document` - Receives file path, extracts, chunks, embeds, and saves to vector DB.
* `POST /ai/chat` - Receives query & document ID. Performs RAG (similarity search -> Gemini) and returns answer.
* `POST /ai/generate-quiz` - Receives document ID. Retrieves chunks and asks Gemini to generate MCQs.
* `POST /ai/generate-summary` - Summarizes a document or specific pages.
