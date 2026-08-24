# AI Smart Study Assistant

## AI Chat Setup (Phase 1)

This project uses Google Gemini to power the AI Study Assistant.

### Prerequisites
- Node.js 18+
- PostgreSQL
- A Google Gemini API Key from Google AI Studio

### Configuration
1. Navigate to the `backend` directory.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your `GEMINI_API_KEY` in the `.env` file.
   - Example: `GEMINI_API_KEY="AIzaSyYourActualKeyHere"`
4. Optionally override the Gemini model with `GEMINI_MODEL`.
   - Default: `gemini-2.5-flash`

### Running the App
1. Start the database:
   ```bash
   docker-compose up -d
   ```
2. Start the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Features
- Real-time AI chat with SSE streaming.
- Conversation history retention.
- Secure, bounded context isolation.
