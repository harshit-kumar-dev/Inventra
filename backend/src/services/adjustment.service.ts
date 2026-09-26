import { prisma, DocumentStatus } from '../config/db';
import { StockEngineService } from './stockEngine.service';

export class AdjustmentService {
  /**
   * Generate next auto-increment reference: <WarehouseCode>/ADJ/<0001>
   */
  private static async generateReferenceNumber(warehouseId: string): Promise<string> {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const whCode = warehouse ? warehouse.code : 'WH';

    const count = await prisma.stockAdjustment.count({
      where: { warehouseId },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `${whCode}/ADJ/${nextNumber}`;
  }

  /**
   * List Adjustments with pagination and filters
   */
  static async getAdjustments(query: {
    status?: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED' | 'ALL';
    warehouseId?: string;
    locationId?: string;
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
    if (query.locationId) where.locationId = query.locationId;

    if (query.productId) {
      where.lines = { some: { productId: query.productId } };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, adjustments] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
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
            },
          },
        },
      }),
    ]);

    const formatted = adjustments.map((adj) => ({
      ...adj,
      totalLines: adj.lines.length,
      netDelta: adj.lines.reduce((acc, l) => acc + l.delta, 0),
    }));

    return {
      adjustments: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single adjustment by ID
   */
  static async getAdjustmentById(id: string) {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
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
          },
        },
      },
    });

    if (!adjustment) {
      throw { statusCode: 404, message: 'Stock adjustment not found.' };
    }

    return adjustment;
  }

  /**
   * Create Stock Adjustment (Initial status: DRAFT)
   */
  static async createAdjustment(
    data: {
      warehouseId: string;
      locationId: string;
      reason: string;
      notes?: string;
      lines: { productId: string; countedQuantity: number }[];
    },
    userId: string
  ) {
    // Validate Warehouse & Location
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw { statusCode: 400, message: 'Warehouse does not exist.' };

    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location || location.warehouseId !== data.warehouseId) {
      throw { statusCode: 400, message: 'Location does not belong to specified warehouse.' };
    }

    // Build lines with live recordedQuantity & calculated delta
    const preparedLines = await Promise.all(
      data.lines.map(async (line) => {
        if (line.countedQuantity < 0) {
          throw { statusCode: 400, message: 'Counted quantity cannot be negative.' };
        }

        const product = await prisma.product.findUnique({ where: { id: line.productId } });
        if (!product) throw { statusCode: 400, message: `Product '${line.productId}' not found.` };

        const currentStock = await StockEngineService.getAvailableStock(line.productId, data.locationId);
        const delta = line.countedQuantity - currentStock;

        return {
          productId: line.productId,
          previousQuantity: currentStock,
          countedQuantity: line.countedQuantity,
          delta,
        };
      })
    );

    const referenceNo = await this.generateReferenceNumber(data.warehouseId);

    return prisma.stockAdjustment.create({
      data: {
        referenceNo,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        reason: data.reason.trim(),
        notes: data.notes?.trim(),
        status: DocumentStatus.DRAFT,
        createdBy: userId,
        lines: {
          create: preparedLines,
        },
      },
      include: {
        warehouse: true,
        location: true,
        lines: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * Edit Draft Adjustment
   */
  static async updateAdjustment(
    id: string,
    data: {
      warehouseId?: string;
      locationId?: string;
      reason?: string;
      notes?: string;
      lines?: { productId: string; countedQuantity: number }[];
    }
  ) {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!adjustment) throw { statusCode: 404, message: 'Adjustment not found.' };

    if (adjustment.status === DocumentStatus.DONE || adjustment.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: `Cannot modify an adjustment in ${adjustment.status} status.` };
    }

    const warehouseId = data.warehouseId || adjustment.warehouseId;
    const locationId = data.locationId || adjustment.locationId;

    let preparedLines: any[] | undefined;
    if (data.lines) {
      preparedLines = await Promise.all(
        data.lines.map(async (line) => {
          if (line.countedQuantity < 0) {
            throw { statusCode: 400, message: 'Counted quantity cannot be negative.' };
          }
          const currentStock = await StockEngineService.getAvailableStock(line.productId, locationId);
          return {
            adjustmentId: id,
            productId: line.productId,
            previousQuantity: currentStock,
            countedQuantity: line.countedQuantity,
            delta: line.countedQuantity - currentStock,
          };
        })
      );
    }

    return prisma.$transaction(async (tx) => {
      if (preparedLines) {
        await tx.adjustmentLine.deleteMany({ where: { adjustmentId: id } });
        await tx.adjustmentLine.createMany({ data: preparedLines });
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: {
          ...(data.warehouseId && { warehouseId: data.warehouseId }),
          ...(data.locationId && { locationId: data.locationId }),
          ...(data.reason && { reason: data.reason.trim() }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() }),
        },
        include: {
          warehouse: true,
          location: true,
          lines: { include: { product: true } },
        },
      });
    });
  }

  /**
   * Move from DRAFT to READY
   */
  static async markReady(id: string) {
    const adjustment = await prisma.stockAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw { statusCode: 404, message: 'Adjustment not found.' };

    if (adjustment.status !== DocumentStatus.DRAFT) {
      throw { statusCode: 400, message: `Cannot move adjustment in ${adjustment.status} status to READY.` };
    }

    return prisma.stockAdjustment.update({
      where: { id },
      data: { status: DocumentStatus.READY },
      include: { warehouse: true, location: true, lines: true },
    });
  }

  /**
   * Validate Stock Adjustment (Applies delta to stock and creates audit ledger row)
   */
  static async validateAdjustment(id: string, userId: string) {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        lines: { include: { product: true } },
      },
    });

    if (!adjustment) throw { statusCode: 404, message: 'Adjustment not found.' };

    if (adjustment.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Adjustment has already been validated and applied.' };
    }

    if (adjustment.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Cannot validate a canceled adjustment.' };
    }

    if (adjustment.lines.length === 0) {
      throw { statusCode: 400, message: 'Cannot validate an adjustment with no lines.' };
    }

    // Execute atomic transaction
    return prisma.$transaction(async (tx) => {
      // 1. Process each line through StockEngineService.adjustStock
      for (const line of adjustment.lines) {
        const result = await StockEngineService.adjustStock(tx, {
          productId: line.productId,
          warehouseId: adjustment.warehouseId,
          locationId: adjustment.locationId,
          countedQuantity: line.countedQuantity,
          reason: adjustment.reason,
          referenceType: 'ADJUSTMENT',
          referenceId: adjustment.referenceNo,
          createdBy: userId,
        });

        // Update line with the precise pre-validation state and delta
        await tx.adjustmentLine.update({
          where: { id: line.id },
          data: {
            previousQuantity: result.previousQuantity,
            delta: result.delta,
          },
        });
      }

      // 2. Mark adjustment as DONE
      const updatedAdjustment = await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: DocumentStatus.DONE,
          validatedBy: userId,
        },
        include: {
          warehouse: true,
          location: true,
          creator: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
          lines: { include: { product: true } },
        },
      });

      return updatedAdjustment;
      },
      { maxWait: 10000, timeout: 25000 }
    );
  }

  /**
   * Cancel Adjustment
   */
  static async cancelAdjustment(id: string) {
    const adjustment = await prisma.stockAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw { statusCode: 404, message: 'Adjustment not found.' };

    if (adjustment.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Cannot cancel an already completed adjustment.' };
    }

    if (adjustment.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Adjustment is already canceled.' };
    }

    return prisma.stockAdjustment.update({
      where: { id },
      data: { status: DocumentStatus.CANCELED },
      include: { warehouse: true, location: true, lines: true },
    });
  }
}
