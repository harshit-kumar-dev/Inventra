import { prisma, DocumentStatus } from '../config/db';
import { StockEngineService } from './stockEngine.service';

export class DeliveryService {
  /**
   * Generate next auto-increment reference: <WarehouseCode>/OUT/<0001>
   */
  private static async generateReferenceNumber(warehouseId: string): Promise<string> {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const whCode = warehouse ? warehouse.code : 'WH';

    const count = await prisma.delivery.count({
      where: { warehouseId },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `${whCode}/OUT/${nextNumber}`;
  }

  /**
   * List Deliveries with pagination and filters
   */
  static async getDeliveries(query: {
    status?: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED' | 'ALL';
    warehouseId?: string;
    productId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as DocumentStatus;
    }

    if (query.warehouseId) where.warehouseId = query.warehouseId;

    if (query.productId) {
      where.lines = { some: { productId: query.productId } };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { responsible: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.scheduleDate = {};
      if (query.startDate) where.scheduleDate.gte = new Date(query.startDate);
      if (query.endDate) where.scheduleDate.lte = new Date(query.endDate);
    }

    const [total, deliveries] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, name: true, email: true } },
          validator: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  uom: { select: { symbol: true } },
                },
              },
              location: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    // Inspect stock availability per line for UI alert warnings
    const formatted = await Promise.all(
      deliveries.map(async (d) => {
        const isLate =
          d.status !== DocumentStatus.DONE &&
          d.status !== DocumentStatus.CANCELED &&
          new Date(d.scheduleDate) < new Date();

        const linesWithStock = await Promise.all(
          d.lines.map(async (l) => {
            const availableStock = await StockEngineService.getAvailableStock(
              l.productId,
              l.locationId
            );
            return {
              ...l,
              availableStock,
              isShortage: availableStock < l.quantity && d.status !== DocumentStatus.DONE,
            };
          })
        );

        const hasShortage = linesWithStock.some((l) => l.isShortage);

        return {
          ...d,
          isLate,
          hasShortage,
          totalQuantity: d.lines.reduce((acc, l) => acc + l.quantity, 0),
          totalItems: d.lines.length,
          lines: linesWithStock,
        };
      })
    );

    return {
      deliveries: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single delivery order by ID
   */
  static async getDeliveryById(id: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        warehouse: true,
        creator: { select: { id: true, name: true, email: true } },
        validator: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: {
              include: {
                category: { select: { name: true } },
                uom: { select: { symbol: true } },
              },
            },
            location: true,
          },
        },
      },
    });

    if (!delivery) {
      throw { statusCode: 404, message: 'Delivery order not found.' };
    }

    const isLate =
      delivery.status !== DocumentStatus.DONE &&
      delivery.status !== DocumentStatus.CANCELED &&
      new Date(delivery.scheduleDate) < new Date();

    const linesWithStock = await Promise.all(
      delivery.lines.map(async (l) => {
        const availableStock = await StockEngineService.getAvailableStock(
          l.productId,
          l.locationId
        );
        return {
          ...l,
          availableStock,
          isShortage: availableStock < l.quantity && delivery.status !== DocumentStatus.DONE,
        };
      })
    );

    const hasShortage = linesWithStock.some((l) => l.isShortage);

    return {
      ...delivery,
      isLate,
      hasShortage,
      totalQuantity: delivery.lines.reduce((acc, l) => acc + l.quantity, 0),
      lines: linesWithStock,
    };
  }

  /**
   * Create Delivery Order
   */
  static async createDelivery(
    data: {
      customerName: string;
      deliveryAddress?: string;
      warehouseId: string;
      scheduleDate: Date;
      responsible?: string;
      notes?: string;
      lines: { productId: string; locationId: string; quantity: number }[];
    },
    userId: string
  ) {
    // Validate Warehouse
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw { statusCode: 400, message: 'Specified warehouse does not exist.' };

    // Validate products and location ownership
    let hasStockShortage = false;
    for (const line of data.lines) {
      if (line.quantity <= 0) {
        throw { statusCode: 400, message: 'Line quantity must be greater than zero.' };
      }

      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) throw { statusCode: 400, message: `Product '${line.productId}' not found.` };

      const location = await prisma.location.findUnique({ where: { id: line.locationId } });
      if (!location) throw { statusCode: 400, message: `Location '${line.locationId}' not found.` };
      if (location.warehouseId !== data.warehouseId) {
        throw {
          statusCode: 400,
          message: `Location '${location.name}' does not belong to warehouse '${warehouse.name}'.`,
        };
      }

      const available = await StockEngineService.getAvailableStock(line.productId, line.locationId);
      if (available < line.quantity) {
        hasStockShortage = true;
      }
    }

    const referenceNo = await this.generateReferenceNumber(data.warehouseId);

    // If initial stock is missing, status can start as WAITING; otherwise DRAFT
    const initialStatus = hasStockShortage ? DocumentStatus.WAITING : DocumentStatus.DRAFT;

    return prisma.delivery.create({
      data: {
        referenceNo,
        customerName: data.customerName.trim(),
        deliveryAddress: data.deliveryAddress?.trim(),
        warehouseId: data.warehouseId,
        status: initialStatus,
        scheduleDate: data.scheduleDate,
        responsible: data.responsible?.trim(),
        notes: data.notes?.trim(),
        createdBy: userId,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            locationId: l.locationId,
            quantity: l.quantity,
          })),
        },
      },
      include: {
        warehouse: true,
        lines: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Edit Draft / Waiting Delivery Order
   */
  static async updateDelivery(
    id: string,
    data: {
      customerName?: string;
      deliveryAddress?: string;
      warehouseId?: string;
      scheduleDate?: Date;
      responsible?: string;
      notes?: string;
      lines?: { productId: string; locationId: string; quantity: number }[];
    }
  ) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found.' };

    if (delivery.status === DocumentStatus.DONE || delivery.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: `Cannot modify a delivery order in ${delivery.status} status.` };
    }

    const warehouseId = data.warehouseId || delivery.warehouseId;

    if (data.lines) {
      for (const line of data.lines) {
        if (line.quantity <= 0) {
          throw { statusCode: 400, message: 'Line quantity must be greater than zero.' };
        }
        const location = await prisma.location.findUnique({ where: { id: line.locationId } });
        if (!location || location.warehouseId !== warehouseId) {
          throw { statusCode: 400, message: `Location is invalid for warehouse.` };
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.deliveryLine.deleteMany({ where: { deliveryId: id } });
        await tx.deliveryLine.createMany({
          data: data.lines.map((l) => ({
            deliveryId: id,
            productId: l.productId,
            locationId: l.locationId,
            quantity: l.quantity,
          })),
        });
      }

      return tx.delivery.update({
        where: { id },
        data: {
          ...(data.customerName && { customerName: data.customerName.trim() }),
          ...(data.deliveryAddress !== undefined && { deliveryAddress: data.deliveryAddress?.trim() }),
          ...(data.warehouseId && { warehouseId: data.warehouseId }),
          ...(data.scheduleDate && { scheduleDate: data.scheduleDate }),
          ...(data.responsible !== undefined && { responsible: data.responsible?.trim() }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() }),
        },
        include: {
          warehouse: true,
          lines: {
            include: { product: true, location: true },
          },
        },
      });
    });
  }

  /**
   * Move from DRAFT / WAITING to READY (verifies all lines have stock)
   */
  static async markReady(id: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        lines: {
          include: { product: true, location: true },
        },
      },
    });

    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found.' };

    if (delivery.status === DocumentStatus.DONE || delivery.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: `Cannot move delivery in ${delivery.status} status to READY.` };
    }

    // Check stock for all lines
    for (const line of delivery.lines) {
      const available = await StockEngineService.getAvailableStock(line.productId, line.locationId);
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Cannot mark READY: Insufficient stock for '${line.product.name}' in '${line.location.name}'. Available: ${available}, Needed: ${line.quantity}.`,
        };
      }
    }

    return prisma.delivery.update({
      where: { id },
      data: { status: DocumentStatus.READY },
      include: { warehouse: true, lines: true },
    });
  }

  /**
   * Validate Delivery Order (Deducts stock atomically in one transaction, writes audit ledger, sets DONE)
   */
  static async validateDelivery(id: string, userId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        warehouse: true,
        lines: {
          include: { product: true, location: true },
        },
      },
    });

    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found.' };

    // Double validation protection
    if (delivery.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Delivery order has already been validated and completed.' };
    }

    if (delivery.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Cannot validate a canceled delivery order.' };
    }

    if (delivery.lines.length === 0) {
      throw { statusCode: 400, message: 'Cannot validate a delivery order with no product lines.' };
    }

    // Pre-flight check: Verify ALL lines have sufficient stock before mutation
    for (const line of delivery.lines) {
      const available = await StockEngineService.getAvailableStock(line.productId, line.locationId);
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Validation failed: Insufficient stock for '${line.product.name}' in '${line.location.name}'. Available: ${available}, Required: ${line.quantity}.`,
        };
      }
    }

    // Execute atomic transaction
    return prisma.$transaction(async (tx) => {
      // 1. Process each line using StockEngineService.decreaseStock
      for (const line of delivery.lines) {
        await StockEngineService.decreaseStock(tx, {
          productId: line.productId,
          warehouseId: delivery.warehouseId,
          locationId: line.locationId,
          quantity: line.quantity,
          referenceType: 'DELIVERY',
          referenceId: delivery.referenceNo,
          createdBy: userId,
        });
      }

      // 2. Mark delivery as DONE
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: DocumentStatus.DONE,
          validatedBy: userId,
        },
        include: {
          warehouse: true,
          creator: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
          lines: {
            include: { product: true, location: true },
          },
        },
      });

      return updatedDelivery;
    });
  }

  /**
   * Cancel Delivery Order
   */
  static async cancelDelivery(id: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found.' };

    if (delivery.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Cannot cancel an already completed delivery order.' };
    }

    if (delivery.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Delivery order is already canceled.' };
    }

    return prisma.delivery.update({
      where: { id },
      data: { status: DocumentStatus.CANCELED },
      include: { warehouse: true, lines: true },
    });
  }
}
