import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transfer.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TransferController {
  static async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TransferService.getTransfers(req.query as any);
      return sendSuccess(res, { transfers: result.transfers }, 'Transfers fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getTransferById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transfer = await TransferService.getTransferById(id);
      return sendSuccess(res, { transfer }, 'Transfer details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const transfer = await TransferService.createTransfer(req.body, req.user!.userId);
      return sendSuccess(res, { transfer }, 'Internal transfer created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transfer = await TransferService.updateTransfer(id, req.body);
      return sendSuccess(res, { transfer }, 'Internal transfer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markReady(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transfer = await TransferService.markReady(id);
      return sendSuccess(res, { transfer }, 'Transfer status moved to READY');
    } catch (error) {
      next(error);
    }
  }

  static async validateTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transfer = await TransferService.validateTransfer(id, req.user!.userId);
      return sendSuccess(res, { transfer }, 'Transfer validated successfully. Stock moved and dual ledger entries recorded.', 200);
    } catch (error) {
      next(error);
    }
  }

  static async cancelTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transfer = await TransferService.cancelTransfer(id);
      return sendSuccess(res, { transfer }, 'Internal transfer canceled successfully');
    } catch (error) {
      next(error);
    }
  }
}
