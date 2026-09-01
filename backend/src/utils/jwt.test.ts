process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import { generateAccessToken, verifyAccessToken, TokenPayload } from './jwt';
import jwt from 'jsonwebtoken';

describe('jwt utils', () => {
  const mockPayload: TokenPayload = {
    userId: '123',
    email: 'test@test.com',
  };

  describe('verifyAccessToken', () => {
    it('should correctly verify a valid token', () => {
      const token = generateAccessToken(mockPayload);
      const payload = verifyAccessToken(token);

      expect(payload.userId).toBe(mockPayload.userId);
      expect(payload.email).toBe(mockPayload.email);
    });

    it('should throw an error for an invalid token string', () => {
      const invalidToken = 'this.is.an.invalid.token';

      expect(() => {
        verifyAccessToken(invalidToken);
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw an error for an expired token', () => {
      const expiredToken = jwt.sign(mockPayload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '0s' });

      expect(() => {
        verifyAccessToken(expiredToken);
      }).toThrow(jwt.TokenExpiredError);
    });
  });
});
