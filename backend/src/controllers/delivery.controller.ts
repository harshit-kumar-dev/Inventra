import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '../services/delivery.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DeliveryController {
  static async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DeliveryService.getDeliveries(req.query as any);
      return sendSuccess(res, { deliveries: result.deliveries }, 'Deliveries fetched successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getDeliveryById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const delivery = await DeliveryService.getDeliveryById(id);
      return sendSuccess(res, { delivery }, 'Delivery details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const delivery = await DeliveryService.createDelivery(req.body, req.user!.userId);
      return sendSuccess(res, { delivery }, 'Delivery created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const delivery = await DeliveryService.updateDelivery(id, req.body);
      return sendSuccess(res, { delivery }, 'Delivery updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markReady(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const delivery = await DeliveryService.markReady(id);
      return sendSuccess(res, { delivery }, 'Delivery status moved to READY');
    } catch (error) {
      next(error);
    }
  }

  static async validateDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const delivery = await DeliveryService.validateDelivery(id, req.user!.userId);
      return sendSuccess(res, { delivery }, 'Delivery validated successfully. Stock decreased and ledger recorded.', 200);
    } catch (error) {
      next(error);
    }
  }

  static async cancelDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const delivery = await DeliveryService.cancelDelivery(id);
      return sendSuccess(res, { delivery }, 'Delivery canceled successfully');
    } catch (error) {
      next(error);
    }
  }
}
