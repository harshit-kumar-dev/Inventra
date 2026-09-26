import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';

export class UnitController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const units = await prisma.unitOfMeasure.findMany({
        orderBy: { name: 'asc' },
      });
      return sendSuccess(res, { units }, 'Units of Measure fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
