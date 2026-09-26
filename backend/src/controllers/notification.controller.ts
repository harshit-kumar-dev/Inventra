import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.getNotifications(req.user?.userId);
      return sendSuccess(res, result, 'Notifications fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const notification = await NotificationService.markAsRead(id);
      return sendSuccess(res, { notification }, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllAsRead(req.user?.userId);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
