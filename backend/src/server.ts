import app from './app';
import { logger } from './utils/logger';
import { validateEnv, config } from './config/env';

// Validate environment variables before starting the server
validateEnv();

const port = config.port;

const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err: any) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
