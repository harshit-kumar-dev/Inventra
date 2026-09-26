import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receipt.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ReceiptController {
  static async getReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReceiptService.getReceipts(req.query as any);
      return sendSuccess(res, { receipts: result.receipts }, 'Receipts fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const receipt = await ReceiptService.getReceiptById(id);
      return sendSuccess(res, { receipt }, 'Receipt details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const receipt = await ReceiptService.createReceipt(req.body, req.user!.userId);
      return sendSuccess(res, { receipt }, 'Receipt created successfully in Draft status', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const receipt = await ReceiptService.updateReceipt(id, req.body);
      return sendSuccess(res, { receipt }, 'Receipt updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markReady(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const receipt = await ReceiptService.markReady(id);
      return sendSuccess(res, { receipt }, 'Receipt status moved to READY');
    } catch (error) {
      next(error);
    }
  }

  static async validateReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const receipt = await ReceiptService.validateReceipt(id, req.user!.userId);
      return sendSuccess(res, { receipt }, 'Receipt validated successfully. Stock levels updated and ledger entries recorded.', 200);
    } catch (error) {
      next(error);
    }
  }

  static async cancelReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const receipt = await ReceiptService.cancelReceipt(id);
      return sendSuccess(res, { receipt }, 'Receipt canceled successfully');
    } catch (error) {
      next(error);
    }
  }
}
