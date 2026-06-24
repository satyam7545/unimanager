import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { BadRequestError } from '../../utils/errors';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const result = await this.authService.register(name, email, password);

      this.setRefreshTokenCookie(res, result.refreshToken);

      res.status(201).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      this.setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = this.getRefreshTokenFromRequest(req);
      if (!refreshToken) {
        throw new BadRequestError('Session token is missing.');
      }

      const result = await this.authService.refresh(refreshToken);
      this.setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = this.getRefreshTokenFromRequest(req);
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      this.clearRefreshTokenCookie(res);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User context not found.');
      }

      const user = await this.authService.me(req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User context not found.');
      }
      const { name, semester, password } = req.body;
      const user = await this.authService.updateProfile(req.user.userId, { name, semester, password });
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Cookie Helpers ---

  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });
  }

  private getRefreshTokenFromRequest(req: Request): string | null {
    // 1. Check cookies if cookie-parser is configured
    if (req.cookies && req.cookies.refreshToken) {
      return req.cookies.refreshToken;
    }

    // 2. Parse from Cookie header directly (fallback in case cookie-parser isn't installed)
    const cookiesHeader = req.headers.cookie;
    if (cookiesHeader) {
      const cookies = cookiesHeader.split(';').reduce((acc: Record<string, string>, cookieStr) => {
        const [key, val] = cookieStr.trim().split('=');
        if (key && val) {
          acc[key] = decodeURIComponent(val);
        }
        return acc;
      }, {});

      if (cookies.refreshToken) {
        return cookies.refreshToken;
      }
    }

    return null;
  }
}
