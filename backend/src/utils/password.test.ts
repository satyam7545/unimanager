import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './password';

jest.mock('bcrypt');

describe('password utils', () => {
  describe('hashPassword', () => {
    it('should hash a password using bcrypt with 12 salt rounds', async () => {
      const mockHash = 'hashed_password_mock';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      const password = 'my_secure_password';
      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(mockHash);
    });
  });

  describe('comparePassword', () => {
    it('should compare a password with a hash using bcrypt', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const password = 'my_secure_password';
      const hash = 'hashed_password_mock';
      const result = await comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false if passwords do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const password = 'wrong_password';
      const hash = 'hashed_password_mock';
      const result = await comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });
  });
});
