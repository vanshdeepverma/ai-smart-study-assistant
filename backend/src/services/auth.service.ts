import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { User, UserRole } from '@prisma/client';
import { config } from '../config/env';

// Omit passwordHash from returned User object
export type SafeUser = Omit<User, 'passwordHash'>;

export class AuthService {
  /**
   * Generates a JWT token for a given user
   */
  static generateToken(user: { id: string; role: string }): string {
    const secret = config.jwt.secret;
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    return jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn }
    );
  }

  /**
   * Strips sensitive data from User object
   */
  static sanitizeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Registers a new user
   */
  static async register(data: any): Promise<{ user: SafeUser; token: string }> {
    const email = data.email.toLowerCase().trim();
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash: hashedPassword,
        role: UserRole.USER, // Default role
      },
    });

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Authenticates a user and returns a token
   */
  static async login(data: any): Promise<{ user: SafeUser; token: string }> {
    const email = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error('LOGIN FAILED: User not found for email:', email);
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      console.error('LOGIN FAILED: Password mismatch for email:', email);
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Finds a user by ID
   */
  static async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.sanitizeUser(user) : null;
  }
}
