import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  static async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await DashboardService.getSummary();
      return sendSuccess(res, summary, 'Dashboard KPI summary fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await DashboardService.getLowStockProducts(page, limit);
      return sendSuccess(res, { products: result.products }, 'Low-stock products fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getOperations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DashboardService.getOperationsFeed(req.query as any);
      return sendSuccess(res, { operations: result.operations }, 'Operations feed fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}
