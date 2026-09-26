import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';

export class CategoryController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getAll();
      return sendSuccess(res, { categories }, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.create(req.body);
      return sendSuccess(res, { category }, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await CategoryService.update(id, req.body);
      return sendSuccess(res, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
