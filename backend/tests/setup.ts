import dotenv from 'dotenv';
dotenv.config();

// Force test environment variables to ensure safe defaults
process.env.NODE_ENV = 'test';

// Only provide mock defaults if they aren't already set in the environment
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgrespassword@localhost:5432/smart_study';
}
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
}
if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'http://localhost:5173';
}
if (!process.env.STORAGE_PROVIDER) {
  process.env.STORAGE_PROVIDER = 'local';
}
