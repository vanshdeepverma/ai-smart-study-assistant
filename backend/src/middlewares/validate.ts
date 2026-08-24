import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../utils/ApiResponse';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', 'VALIDATION_ERROR', (error as any).issues || (error as any).errors)
        );
      }
      return next(error);
    }
  };
};
