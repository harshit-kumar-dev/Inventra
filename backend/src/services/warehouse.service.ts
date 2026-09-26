import { prisma } from '@stocksense/database';
import { LocationType } from '@prisma/client';

export class WarehouseService {
  static async getWarehouses() {
    return prisma.warehouse.findMany({
      include: {
        locations: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { locations: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getWarehouseById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { name: 'asc' },
          include: {
            stockQuantities: {
              where: { quantity: { gt: 0 } },
              include: {
                product: {
                  select: { id: true, name: true, sku: true, uom: true },
                },
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return warehouse;
  }

  static async createWarehouse(data: { name: string; code: string; address?: string }) {
    return prisma.warehouse.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        address: data.address?.trim(),
      },
      include: { locations: true },
    });
  }

  static async updateWarehouse(
    id: string,
    data: { name?: string; code?: string; address?: string; active?: boolean }
  ) {
    return prisma.warehouse.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
        ...(data.address !== undefined && { address: data.address.trim() }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: { locations: true },
    });
  }

  static async getLocations(warehouseId?: string) {
    return prisma.location.findMany({
      where: {
        ...(warehouseId && { warehouseId }),
        active: true,
      },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createLocation(data: {
    warehouseId: string;
    name: string;
    code: string;
    type?: LocationType;
  }) {
    return prisma.location.create({
      data: {
        warehouseId: data.warehouseId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        type: data.type || LocationType.INTERNAL,
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }

  static async updateLocation(
    id: string,
    data: { name?: string; code?: string; type?: LocationType; active?: boolean }
  ) {
    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
        ...(data.type && { type: data.type }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
