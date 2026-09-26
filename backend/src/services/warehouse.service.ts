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
        _count: {
          select: {
            locations: true,
            receipts: true,
            deliveries: true,
            sourceTransfers: true,
            destinationTransfers: true,
            stockAdjustments: true,
            ledgerEntries: true,
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
    const existingCode = await prisma.warehouse.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new Error(`Warehouse short code "${data.code.trim().toUpperCase()}" is already in use.`);
    }

    const existingName = await prisma.warehouse.findUnique({
      where: { name: data.name.trim() },
    });
    if (existingName) {
      throw new Error(`Warehouse name "${data.name.trim()}" is already in use.`);
    }

    return prisma.warehouse.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        address: data.address?.trim() || null,
      },
      include: { locations: true, _count: { select: { locations: true } } },
    });
  }

  static async updateWarehouse(
    id: string,
    data: { name?: string; code?: string; address?: string; active?: boolean }
  ) {
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Warehouse not found');
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const codeTaken = await prisma.warehouse.findUnique({
        where: { code: data.code.trim().toUpperCase() },
      });
      if (codeTaken) {
        throw new Error(`Warehouse short code "${data.code.trim().toUpperCase()}" is already in use.`);
      }
    }

    if (data.name && data.name.trim() !== existing.name) {
      const nameTaken = await prisma.warehouse.findUnique({
        where: { name: data.name.trim() },
      });
      if (nameTaken) {
        throw new Error(`Warehouse name "${data.name.trim()}" is already in use.`);
      }
    }

    return prisma.warehouse.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
        ...(data.address !== undefined && { address: data.address.trim() || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: { locations: true, _count: { select: { locations: true } } },
    });
  }

  static async deleteWarehouse(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            locations: true,
            receipts: true,
            deliveries: true,
            sourceTransfers: true,
            destinationTransfers: true,
            stockAdjustments: true,
            ledgerEntries: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const counts = warehouse._count;
    const totalRefs =
      counts.locations +
      counts.receipts +
      counts.deliveries +
      counts.sourceTransfers +
      counts.destinationTransfers +
      counts.stockAdjustments +
      counts.ledgerEntries;

    if (totalRefs > 0) {
      const reasons: string[] = [];
      if (counts.locations > 0) reasons.push(`${counts.locations} locations`);
      if (counts.receipts > 0) reasons.push(`${counts.receipts} receipts`);
      if (counts.deliveries > 0) reasons.push(`${counts.deliveries} deliveries`);
      if (counts.sourceTransfers > 0 || counts.destinationTransfers > 0)
        reasons.push(`${counts.sourceTransfers + counts.destinationTransfers} transfers`);
      if (counts.stockAdjustments > 0) reasons.push(`${counts.stockAdjustments} adjustments`);
      if (counts.ledgerEntries > 0) reasons.push(`${counts.ledgerEntries} ledger records`);

      throw new Error(
        `Cannot delete warehouse "${warehouse.name}". It is referenced by: ${reasons.join(', ')}. To prevent data corruption, active warehouse records cannot be deleted.`
      );
    }

    return prisma.warehouse.delete({
      where: { id },
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
        _count: {
          select: {
            stockQuantities: true,
            receiptLines: true,
            deliveryLines: true,
          },
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
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new Error('Associated warehouse not found.');
    }

    const existingLocCode = await prisma.location.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: data.warehouseId,
          code: data.code.trim().toUpperCase(),
        },
      },
    });

    if (existingLocCode) {
      throw new Error(
        `Location short code "${data.code.trim().toUpperCase()}" already exists in warehouse "${warehouse.name}".`
      );
    }

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
    data: { warehouseId?: string; name?: string; code?: string; type?: LocationType; active?: boolean }
  ) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Location not found');
    }

    const targetWarehouseId = data.warehouseId || existing.warehouseId;
    const targetCode = data.code ? data.code.trim().toUpperCase() : existing.code;

    if (targetCode !== existing.code || targetWarehouseId !== existing.warehouseId) {
      const codeTaken = await prisma.location.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: targetWarehouseId,
            code: targetCode,
          },
        },
      });
      if (codeTaken && codeTaken.id !== id) {
        throw new Error(`Location short code "${targetCode}" is already in use in this warehouse.`);
      }
    }

    return prisma.location.update({
      where: { id },
      data: {
        ...(data.warehouseId && { warehouseId: data.warehouseId }),
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: targetCode }),
        ...(data.type && { type: data.type }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }

  static async deleteLocation(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockQuantities: true,
            receiptLines: true,
            deliveryLines: true,
            sourceTransferLines: true,
            destinationTransferLines: true,
            stockAdjustments: true,
            ledgerEntries: true,
          },
        },
      },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    const activeStock = await prisma.stockQuantity.count({
      where: { locationId: id, quantity: { gt: 0 } },
    });

    const counts = location._count;
    const totalTransactions =
      counts.receiptLines +
      counts.deliveryLines +
      counts.sourceTransferLines +
      counts.destinationTransferLines +
      counts.stockAdjustments +
      counts.ledgerEntries;

    if (activeStock > 0 || totalTransactions > 0) {
      const reasons: string[] = [];
      if (activeStock > 0) reasons.push(`active stock on hand (${activeStock} products)`);
      if (counts.receiptLines > 0) reasons.push(`${counts.receiptLines} receipt lines`);
      if (counts.deliveryLines > 0) reasons.push(`${counts.deliveryLines} delivery lines`);
      if (counts.sourceTransferLines > 0 || counts.destinationTransferLines > 0)
        reasons.push(`${counts.sourceTransferLines + counts.destinationTransferLines} transfer lines`);
      if (counts.stockAdjustments > 0) reasons.push(`${counts.stockAdjustments} adjustment lines`);
      if (counts.ledgerEntries > 0) reasons.push(`${counts.ledgerEntries} ledger records`);

      throw new Error(
        `Cannot delete location "${location.name}". It is referenced by: ${reasons.join(', ')}. Storage locations with existing stock or transaction history cannot be deleted.`
      );
    }

    return prisma.location.delete({
      where: { id },
    });
  }
}
