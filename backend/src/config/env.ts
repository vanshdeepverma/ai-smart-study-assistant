import dotenv from 'dotenv';
dotenv.config();

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const requiredProductionVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'FRONTEND_URL'
  ];

  if (isProduction) {
    const missingVars = requiredProductionVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`CRITICAL STARTUP ERROR: Missing required production environment variables: ${missingVars.join(', ')}`);
    }

    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      throw new Error('CRITICAL STARTUP ERROR: JWT_SECRET is set to the default placeholder in production. This is highly insecure.');
    }
  }

  // Set default fallbacks strictly for development
  if (!isProduction && !isTest) {
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ WARNING: DATABASE_URL is missing. Attempting fallback for local development.');
    }
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ WARNING: JWT_SECRET is missing. Using insecure fallback for local development.');
    }
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ WARNING: GEMINI_API_KEY is missing. AI endpoints will fail.');
    }
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    url: process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'postgresql://postgres:postgrespassword@localhost:5432/smart_study'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'your-super-secret-jwt-key-change-in-production'),
  },
  cors: {
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : true),
  },
  ai: {
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  }
};
