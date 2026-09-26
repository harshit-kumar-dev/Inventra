import { Request, Response } from 'express';
import { WarehouseService } from '../services/warehouse.service';
import { LocationType } from '@prisma/client';

export class WarehouseController {
  static async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      const warehouses = await WarehouseService.getWarehouses();
      res.json({ success: true, data: { warehouses } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getWarehouseById(req: Request, res: Response): Promise<void> {
    try {
      const warehouse = await WarehouseService.getWarehouseById(req.params.id as string);
      res.json({ success: true, data: { warehouse } });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async createWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, address } = req.body;
      if (!name || !code) {
        res.status(400).json({ success: false, message: 'Name and code are required' });
        return;
      }
      const warehouse = await WarehouseService.createWarehouse({ name, code, address });
      res.status(201).json({ success: true, data: { warehouse } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const warehouse = await WarehouseService.updateWarehouse(req.params.id as string, req.body);
      res.json({ success: true, data: { warehouse } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const locations = await WarehouseService.getLocations(warehouseId);
      res.json({ success: true, data: { locations } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId, name, code, type } = req.body;
      if (!warehouseId || !name || !code) {
        res.status(400).json({ success: false, message: 'Warehouse, name, and code are required' });
        return;
      }
      const location = await WarehouseService.createLocation({
        warehouseId,
        name,
        code,
        type: type as LocationType,
      });
      res.status(201).json({ success: true, data: { location } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const location = await WarehouseService.updateLocation(req.params.id as string, req.body);
      res.json({ success: true, data: { location } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
