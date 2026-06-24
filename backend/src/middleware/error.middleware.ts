import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  let statusCode = 500;
  let status = 'error';
  let message = 'Internal Server Error';
  let errors: any = undefined;

  // Check if it is our custom operational AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
  } 
  // Handle Prisma Database Error cases if necessary
  else if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    status = 'fail';
    message = 'Database validation or resource conflict occurred.';
  }
  // Standard JSON web token error
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Authentication token expired.';
  }

  // Under development environment, show the stack trace for easier debugging
  const response: any = {
    status,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Log non-operational errors
  if (statusCode === 500) {
    console.error('💥 ERROR:', err);
  }

  return res.status(statusCode).json(response);
};
