import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
  TooManyRequestsError,
} from './errors';

describe('Custom Errors', () => {
  describe('AppError', () => {
    it('should set the message, statusCode, status (fail for 4xx), and isOperational properties correctly', () => {
      const error = new AppError('Test error message', 400);

      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set status to error for 5xx status codes', () => {
      const error = new AppError('Server error', 500);

      expect(error.status).toBe('error');
    });
  });

  describe('BadRequestError', () => {
    it('should initialize with correct default values', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad Request');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new BadRequestError('Custom Bad Request');

      expect(error.message).toBe('Custom Bad Request');
    });
  });

  describe('UnauthorizedError', () => {
    it('should initialize with correct default values', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new UnauthorizedError('Custom Unauthorized');

      expect(error.message).toBe('Custom Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should initialize with correct default values', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new ForbiddenError('Custom Forbidden');

      expect(error.message).toBe('Custom Forbidden');
    });
  });

  describe('NotFoundError', () => {
    it('should initialize with correct default values', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new NotFoundError('Custom Not Found');

      expect(error.message).toBe('Custom Not Found');
    });
  });

  describe('InternalServerError', () => {
    it('should initialize with correct default values', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal Server Error');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new InternalServerError('Custom Server Error');

      expect(error.message).toBe('Custom Server Error');
    });
  });

  describe('TooManyRequestsError', () => {
    it('should initialize with correct default values', () => {
      const error = new TooManyRequestsError();

      expect(error.message).toBe('Too many requests, please try again later.');
      expect(error.statusCode).toBe(429);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should initialize with custom message', () => {
      const error = new TooManyRequestsError('Custom Too Many Requests');

      expect(error.message).toBe('Custom Too Many Requests');
    });
  });
});
