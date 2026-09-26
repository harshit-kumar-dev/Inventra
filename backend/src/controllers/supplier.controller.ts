import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service';
import { sendSuccess } from '../utils/response';

export class SupplierController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const suppliers = await SupplierService.getAll();
      return sendSuccess(res, { suppliers }, 'Suppliers fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplier = await SupplierService.getById(id);
      return sendSuccess(res, { supplier }, 'Supplier fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.create(req.body);
      return sendSuccess(res, { supplier }, 'Supplier created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplier = await SupplierService.update(id, req.body);
      return sendSuccess(res, { supplier }, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
