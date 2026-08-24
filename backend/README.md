# AI Smart Study Assistant - Backend

This is the backend service for the AI Smart Study Assistant, built with Node.js, Express, TypeScript, and Prisma ORM.

## Architecture
The backend follows a strict layered architecture:
- `Routes`: Define API endpoints and apply middleware.
- `Controllers`: Handle HTTP requests and responses.
- `Services`: Contain core business logic (To be implemented).
- `Repositories / Prisma`: Handle database interactions.

## How to Install
```bash
npm install
```

## How to Configure Environment Variables
1. Copy the example env file: `cp .env.example .env`
2. Update the `DATABASE_URL` in `.env` to point to a valid PostgreSQL instance (e.g., local Docker or cloud provider like Supabase/Neon).

## Database Setup & Architecture
The system uses PostgreSQL and is built for future RAG (Retrieval-Augmented Generation) scaling.
The ER Diagram and Schema are fully normalized to handle Users, Documents, Flashcards, Study Plans, and Quizzes efficiently.

## Prisma 7 Database Commands
> **Note:** Prisma 7 configuration (such as the database URL) is managed centrally in `prisma.config.ts`. Do not place `url = env("DATABASE_URL")` directly in `schema.prisma`.

```bash
# Format your schema
npx prisma format

# Validate schema syntax
npx prisma validate

# Generate the Prisma Client
npx prisma generate

# Run migrations against your database
npx prisma migrate dev --name <migration_name>

# Seed the database with development data
npm run seed

## Authentication Architecture (Phase 4)
The application uses a secure, modern authentication architecture:
- **Hashing**: `bcryptjs` is used to securely hash passwords before storing them in PostgreSQL.
- **JWT**: JSON Web Tokens are used for stateless authentication.
- **Storage Strategy**: Tokens are strictly stored in `HttpOnly` Secure Cookies. This neutralizes XSS (Cross-Site Scripting) token theft, while CORS and SameSite policies prevent CSRF attacks.
- **Authorization**: RBAC (Role-Based Access Control) is implemented using middleware (`requireRole('ADMIN')`).

### Auth Endpoints
- `POST /api/v1/auth/register`: Register a new user (Default: `USER`).
- `POST /api/v1/auth/login`: Authenticate and receive an HttpOnly cookie.
- `POST /api/v1/auth/logout`: Clear the authentication cookie.
- `GET /api/v1/auth/me`: Retrieve current user profile (requires Auth).

### Development Admin
To test Admin features in development, run `npm run seed`. This provisions a `System Admin` account. Do not manually assign roles via direct DB updates unless necessary.

# Open Prisma Studio to view tables visually
npx prisma studio
```

## How to Run Development Server
```bash
npm run dev
```

## How to Run Production Build
```bash
npm run build
npm start
```

## How to Run Tests
```bash
npm test
```

## API Health Endpoint
The server provides a health check endpoint:
`GET /api/v1/health`
