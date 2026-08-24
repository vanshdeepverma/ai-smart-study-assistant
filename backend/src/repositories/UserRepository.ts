import { User } from '@prisma/client';
import { prisma } from '../utils/db';

export class UserRepository {
  /**
   * Find a user by their email address
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new development user
   */
  static async createDevUser(data: { email: string; name: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        role: 'USER',
      },
    });
  }
}
