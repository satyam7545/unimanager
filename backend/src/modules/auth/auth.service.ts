import { AuthRepository } from './auth.repository';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors';
import { User } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class AuthService {
  private authRepository = new AuthRepository();

  async register(name: string, email: string, password: string) {
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestError('Email is already registered.');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.authRepository.createUser(name, email, passwordHash);

    // Generate initial tokens
    const { accessToken, refreshToken } = await this.createSession(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Update last active
    await this.updateLastActive(user.id);

    const { accessToken, refreshToken } = await this.createSession(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string) {
    try {
      // 1. Verify token signature
      const payload = verifyRefreshToken(token);

      // 2. Look up token in database
      const dbToken = await this.authRepository.findRefreshToken(token);
      if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
        // If a refresh token is reused or hijacked, revoke all user tokens for safety
        if (dbToken && dbToken.revoked) {
          await this.authRepository.revokeAllUserRefreshTokens(dbToken.userId);
        }
        throw new UnauthorizedError('Session expired or invalid token.');
      }

      // 3. Find user
      const user = await this.authRepository.findUserById(payload.userId);
      if (!user) {
        throw new UnauthorizedError('User session not found.');
      }

      // 4. Delete old token (token rotation)
      await this.authRepository.deleteRefreshToken(token);

      // 5. Generate new session
      const tokens = await this.createSession(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid session credentials.');
    }
  }

  async logout(token: string) {
    await this.authRepository.deleteRefreshToken(token);
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: { name?: string; semester?: string | null; password?: string }) {
    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.semester !== undefined) {
      updateData.semester = data.semester;
    }
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.sanitizeUser(user);
  }

  // --- Helper Methods ---

  private async createSession(user: User) {
    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Calculate expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save refresh token to database
    await this.authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Background cleanup of expired/revoked tokens (non-blocking)
    this.authRepository.cleanExpiredRefreshTokens().catch(() => {});

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  private async updateLastActive(userId: string) {
    // Background task (we don't await strictly to keep login prompt snappy)
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
    } catch (e) {
      // Fail silently for background stats updating
    }
  }
}
