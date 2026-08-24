# Authentication Regression Report

## 1. Exact Root Cause
**PASS**
The root cause is **not** a flaw in the authentication logic, CORS, or cookies. The regression occurred because the `npm test` suite (prior to the P0 isolation fix) executed `await prisma.user.deleteMany()` directly against the shared development database (`ai_study_assistant`). This completely wiped the `user` table, deleting the existing development/test accounts. Subsequent login attempts failed because the user account no longer existed in the database, correctly returning `401 Unauthorized`.

## 2. How it was reproduced
**PASS**
- Verified the database was completely empty (`[]` returned from `prisma.user.findMany()`).
- Attempted to log in with an arbitrary user, which resulted in a legitimate `401 Unauthorized`.
- Registered a new user (`admin@example.com`), which successfully returned a `201 Created` with a valid HttpOnly JWT cookie.
- Spun up a headless browser (Puppeteer) on `http://localhost:5173`, successfully logged in, verified the JWT cookie was stored, and verified that page reloads maintained the authenticated state via `/api/v1/auth/me`.

## 3. Files Inspected
**PASS**
- `backend/src/app.ts` (CORS configuration)
- `backend/src/controllers/auth.controller.ts` (Cookie options and login logic)
- `backend/src/services/auth.service.ts` (JWT generation)
- `frontend/src/lib/api.ts` (Fetch utility and credentials settings)
- `frontend/src/hooks/useAuth.ts` (TanStack Query `/me` hook)
- `frontend/src/pages/Login.tsx` (Login page component)
- `frontend/src/components/layout/ProtectedRoute.tsx` (Protected route wrapper)
- `backend/.env` and `frontend/vite.config.ts`

## 4. Files Changed
**PASS**
No source code required modification. The Phase 4 security architecture is completely intact and functioning as designed. 
*(Note: The destructive `deleteMany()` test hooks were already addressed during the P0 test isolation phase, preventing this issue from happening again on subsequent test runs).*

## 5. Cookie Behavior
**PASS**
The backend correctly issues:
`Set-Cookie: token=<jwt>; Max-Age=604800; Path=/; Expires=...; HttpOnly; SameSite=Strict`
Because the frontend and backend are accessed on `localhost` (port 5173 and 3000), they are evaluated as the same site. The browser correctly attaches the `SameSite=Strict` cookie to `credentials: 'include'` fetch requests.

## 6. /me Behavior
**PASS**
`GET /api/v1/auth/me` perfectly extracts the HttpOnly cookie using `cookie-parser`, validates the JWT signature, and returns the sanitized user object to the frontend.

## 7. Database Verification
**PASS**
PostgreSQL is running. The expected development user did **not** exist due to the test suite wipe. The database schema is fully intact.

## 8. Test Results
**PASS**
`npm test` succeeds. The test suite does not require a valid API key and correctly mocks out LLM calls, returning a deterministic pass without wiping the database anymore.

## 9. Frontend Build Result
**PASS**
`npm run build` and `npm run lint` execute successfully without breaking errors.

## 10. Manual Login Result
**PASS**
A new user was successfully registered via the frontend (`e2e@example.com`). The frontend accurately traversed the entire authentication flow, storing the cookie, bouncing through `/me`, landing securely on `/dashboard`, and surviving page refreshes without state loss.
