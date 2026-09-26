import { Request, Response, NextFunction } from 'express';
import { StockEngineService } from '../services/stockEngine.service';
import { sendSuccess } from '../utils/response';

export class StockController {
  static async queryStock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await StockEngineService.queryStock(req.query as any);
      return sendSuccess(res, { stock: result.stock }, 'Stock levels fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getStockByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId as string;
      const result = await StockEngineService.queryStock({ productId });
      return sendSuccess(res, { stock: result.stock }, 'Product stock levels fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStockByWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouseId = req.params.warehouseId as string;
      const result = await StockEngineService.queryStock({ warehouseId });
      return sendSuccess(res, { stock: result.stock }, 'Warehouse stock levels fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStockByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const locationId = req.params.locationId as string;
      const result = await StockEngineService.queryStock({ locationId });
      return sendSuccess(res, { stock: result.stock }, 'Location stock levels fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getLedgerHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await StockEngineService.getLedgerHistory(req.query as any);
      return sendSuccess(res, { ledger: result.ledger }, 'Stock ledger movements fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getStockAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await StockEngineService.getStockAlerts();
      return sendSuccess(res, alerts, 'Stock alerts fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
