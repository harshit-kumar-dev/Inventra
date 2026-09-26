import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { sendSuccess } from '../utils/response';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.getProducts(req.query as any);
      return sendSuccess(
        res,
        { products: result.products },
        'Products fetched successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await ProductService.getProductById(id);
      return sendSuccess(res, { product }, 'Product details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.body);
      return sendSuccess(res, { product }, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await ProductService.updateProduct(id, req.body);
      return sendSuccess(res, { product }, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleProductStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { active } = req.body;
      const product = await ProductService.toggleProductStatus(id, Boolean(active));
      return sendSuccess(res, { product }, `Product status updated to ${active ? 'active' : 'inactive'}`);
    } catch (error) {
      next(error);
    }
  }
}
