import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('💥 Unhandled Exception:', err);

  // Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || [];
    return sendError(res, `A record with this ${target.join(', ')} already exists.`, 409);
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return sendError(res, 'Requested resource was not found.', 404);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode);
};
