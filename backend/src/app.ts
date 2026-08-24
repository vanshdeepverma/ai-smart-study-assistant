import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { config } from './config/env';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body & Cookie Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request Logging
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// API Routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
