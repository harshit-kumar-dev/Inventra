import { Request, Response, NextFunction } from 'express';
import { AdjustmentService } from '../services/adjustment.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AdjustmentController {
  static async getAdjustments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdjustmentService.getAdjustments(req.query as any);
      return sendSuccess(res, { adjustments: result.adjustments }, 'Adjustments fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getAdjustmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adjustment = await AdjustmentService.getAdjustmentById(id);
      return sendSuccess(res, { adjustment }, 'Adjustment details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createAdjustment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const adjustment = await AdjustmentService.createAdjustment(req.body, req.user!.userId);
      return sendSuccess(res, { adjustment }, 'Stock adjustment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adjustment = await AdjustmentService.updateAdjustment(id, req.body);
      return sendSuccess(res, { adjustment }, 'Stock adjustment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markReady(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adjustment = await AdjustmentService.markReady(id);
      return sendSuccess(res, { adjustment }, 'Stock adjustment moved to READY status');
    } catch (error) {
      next(error);
    }
  }

  static async validateAdjustment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adjustment = await AdjustmentService.validateAdjustment(id, req.user!.userId);
      return sendSuccess(res, { adjustment }, 'Stock adjustment validated and applied to inventory successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async cancelAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adjustment = await AdjustmentService.cancelAdjustment(id);
      return sendSuccess(res, { adjustment }, 'Stock adjustment canceled successfully');
    } catch (error) {
      next(error);
    }
  }
}
