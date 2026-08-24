import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/ApiResponse';
import { config } from '../config/env';

interface JwtPayload {
  id: string;
  role: string;
}

/**
 * Middleware to require valid JWT authentication via HttpOnly cookie
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
    }

    const secret = config.jwt.secret;
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Attach decoded user info to the request object
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json(ApiResponse.error('Invalid or expired token', 'UNAUTHORIZED'));
  }
};

/**
 * Middleware to restrict access based on roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json(ApiResponse.error('Access denied. Insufficient permissions.', 'FORBIDDEN'));
    }

    next();
  };
};
