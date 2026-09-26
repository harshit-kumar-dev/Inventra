import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@stocksense/database';

export class UserController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const role = req.query.role as Role | undefined;

      const users = await UserService.getAll(search, role);
      return sendSuccess(res, { users }, 'Users fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await UserService.getById(id);
      return sendSuccess(res, { user }, 'User fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.create(req.body);
      return sendSuccess(res, { user }, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await UserService.update(id, req.body);
      return sendSuccess(res, { user }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const requesterUserId = req.user?.userId;
      const result = await UserService.delete(id, requesterUserId);
      return sendSuccess(res, result, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
