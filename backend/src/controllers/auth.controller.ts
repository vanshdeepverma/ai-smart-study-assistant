import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { config } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: (config.env === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  /**
   * Handles user registration
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, token } = await AuthService.register(req.body);

      res.cookie('token', token, COOKIE_OPTIONS);

      return res.status(201).json(
        ApiResponse.success(user, 'User registered successfully')
      );
    } catch (error: any) {
      if (error.message === 'Email is already registered') {
        return res.status(409).json(ApiResponse.error(error.message, 'CONFLICT'));
      }
      next(error);
    }
  }

  /**
   * Handles user login
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.cookie('token', token, COOKIE_OPTIONS);

      return res.status(200).json(
        ApiResponse.success(user, 'Login successful')
      );
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        return res.status(401).json(ApiResponse.error(error.message, 'UNAUTHORIZED'));
      }
      next(error);
    }
  }

  /**
   * Handles user logout
   */
  static async logout(_req: Request, res: Response) {
    res.clearCookie('token', COOKIE_OPTIONS);
    return res.status(200).json(
      ApiResponse.success(null, 'Logged out successfully')
    );
  }

  /**
   * Returns current authenticated user
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const user = await AuthService.getUserById(userId);

      if (!user) {
        return res.status(404).json(ApiResponse.error('User not found', 'NOT_FOUND'));
      }

      return res.status(200).json(ApiResponse.success(user, 'Current user retrieved'));
    } catch (error) {
      next(error);
    }
  }
}
