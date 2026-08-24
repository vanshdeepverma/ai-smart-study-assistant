import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export const errorHandler = (
  err: Error | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const appError = (err instanceof Error ? err : new Error(String(err))) as AppError;
  
  logger.error(`Error: ${appError.message}`, { stack: appError.stack });

  // Handle specific well-known errors here if necessary
  
  const statusCode = appError.statusCode || 500;
  const message = appError.isOperational ? appError.message : 'Internal Server Error';
  const code = appError.code || 'INTERNAL_ERROR';

  res.status(statusCode).json(
    ApiResponse.error(message, code, process.env.NODE_ENV === 'development' ? appError.stack : undefined)
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`, 'NOT_FOUND'));
};
