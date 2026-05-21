import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: ErrorWithStatus,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err);

  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 500
    ? err.statusCode
    : 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
