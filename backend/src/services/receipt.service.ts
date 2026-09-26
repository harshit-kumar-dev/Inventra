import { prisma, DocumentStatus } from '../config/db';
import { StockEngineService } from './stockEngine.service';

export class ReceiptService {
  /**
   * Generate next auto-increment reference: <WarehouseCode>/IN/<0001>
   */
  private static async generateReferenceNumber(warehouseId: string): Promise<string> {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const whCode = warehouse ? warehouse.code : 'WH';

    const count = await prisma.receipt.count({
      where: { warehouseId },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `${whCode}/IN/${nextNumber}`;
  }

  /**
   * List Receipts with pagination and filters
   */
  static async getReceipts(query: {
    status?: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED' | 'ALL';
    warehouseId?: string;
    supplierId?: string;
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
    if (query.supplierId) where.supplierId = query.supplierId;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { responsible: { contains: s, mode: 'insensitive' } },
        { supplier: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.scheduleDate = {};
      if (query.startDate) where.scheduleDate.gte = new Date(query.startDate);
      if (query.endDate) where.scheduleDate.lte = new Date(query.endDate);
    }

    const [total, receipts] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, email: true, phone: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, name: true, email: true } },
          validator: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: { select: { symbol: true } } } },
              location: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    const formatted = receipts.map((r) => {
      const isLate = r.status !== DocumentStatus.DONE && r.status !== DocumentStatus.CANCELED && new Date(r.scheduleDate) < new Date();
      return {
        ...r,
        isLate,
        totalQuantity: r.lines.reduce((acc, l) => acc + l.quantity, 0),
        totalItems: r.lines.length,
      };
    });

    return {
      receipts: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single receipt by ID
   */
  static async getReceiptById(id: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
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

    if (!receipt) {
      throw { statusCode: 404, message: 'Receipt not found.' };
    }

    const isLate = receipt.status !== DocumentStatus.DONE && receipt.status !== DocumentStatus.CANCELED && new Date(receipt.scheduleDate) < new Date();

    return {
      ...receipt,
      isLate,
      totalQuantity: receipt.lines.reduce((acc, l) => acc + l.quantity, 0),
    };
  }

  /**
   * Create Receipt (Initial state: DRAFT)
   */
  static async createReceipt(
    data: {
      supplierId: string;
      warehouseId: string;
      scheduleDate: Date;
      responsible?: string;
      notes?: string;
      lines: { productId: string; locationId: string; quantity: number }[];
    },
    userId: string
  ) {
    // Validate Supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw { statusCode: 400, message: 'Specified supplier does not exist.' };

    // Validate Warehouse exists
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw { statusCode: 400, message: 'Specified warehouse does not exist.' };

    // Validate all products and locations exist
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
    }

    const referenceNo = await this.generateReferenceNumber(data.warehouseId);

    return prisma.receipt.create({
      data: {
        referenceNo,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        status: DocumentStatus.DRAFT,
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
        supplier: true,
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
   * Edit Draft Receipt
   */
  static async updateReceipt(
    id: string,
    data: {
      supplierId?: string;
      warehouseId?: string;
      scheduleDate?: Date;
      responsible?: string;
      notes?: string;
      lines?: { productId: string; locationId: string; quantity: number }[];
    }
  ) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!receipt) throw { statusCode: 404, message: 'Receipt not found.' };

    if (receipt.status === DocumentStatus.DONE || receipt.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: `Cannot modify a receipt in ${receipt.status} status.` };
    }

    const warehouseId = data.warehouseId || receipt.warehouseId;

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
        await tx.receiptLine.deleteMany({ where: { receiptId: id } });
        await tx.receiptLine.createMany({
          data: data.lines.map((l) => ({
            receiptId: id,
            productId: l.productId,
            locationId: l.locationId,
            quantity: l.quantity,
          })),
        });
      }

      return tx.receipt.update({
        where: { id },
        data: {
          ...(data.supplierId && { supplierId: data.supplierId }),
          ...(data.warehouseId && { warehouseId: data.warehouseId }),
          ...(data.scheduleDate && { scheduleDate: data.scheduleDate }),
          ...(data.responsible !== undefined && { responsible: data.responsible?.trim() }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() }),
        },
        include: {
          supplier: true,
          warehouse: true,
          lines: {
            include: { product: true, location: true },
          },
        },
      });
    });
  }

  /**
   * Move from DRAFT to READY
   */
  static async markReady(id: string) {
    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found.' };

    if (receipt.status !== DocumentStatus.DRAFT) {
      throw { statusCode: 400, message: `Receipt cannot be moved to READY from ${receipt.status} status.` };
    }

    return prisma.receipt.update({
      where: { id },
      data: { status: DocumentStatus.READY },
      include: { supplier: true, warehouse: true, lines: true },
    });
  }

  /**
   * Validate Receipt (Moves status to DONE and atomically increments StockQuantity and creates StockLedger rows)
   */
  static async validateReceipt(id: string, userId: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        lines: {
          include: { product: true, location: true },
        },
      },
    });

    if (!receipt) throw { statusCode: 404, message: 'Receipt not found.' };

    // Double validation protection
    if (receipt.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Receipt has already been validated and completed.' };
    }

    if (receipt.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Cannot validate a canceled receipt.' };
    }

    if (receipt.lines.length === 0) {
      throw { statusCode: 400, message: 'Cannot validate a receipt with no product lines.' };
    }

    // Execute atomic transaction
    return prisma.$transaction(async (tx) => {
      // 1. Process each line using StockEngineService
      for (const line of receipt.lines) {
        await StockEngineService.increaseStock(tx, {
          productId: line.productId,
          warehouseId: receipt.warehouseId,
          locationId: line.locationId,
          quantity: line.quantity,
          referenceType: 'RECEIPT',
          referenceId: receipt.referenceNo,
          createdBy: userId,
        });
      }

      // 2. Mark receipt as DONE
      const updatedReceipt = await tx.receipt.update({
        where: { id },
        data: {
          status: DocumentStatus.DONE,
          validatedBy: userId,
        },
        include: {
          supplier: true,
          warehouse: true,
          creator: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
          lines: {
            include: { product: true, location: true },
          },
        },
      });

      return updatedReceipt;
      },
      { maxWait: 10000, timeout: 25000 }
    );
  }

  /**
   * Cancel Receipt
   */
  static async cancelReceipt(id: string) {
    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found.' };

    if (receipt.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Cannot cancel an already completed receipt.' };
    }

    if (receipt.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Receipt is already canceled.' };
    }

    return prisma.receipt.update({
      where: { id },
      data: { status: DocumentStatus.CANCELED },
      include: { supplier: true, warehouse: true, lines: true },
    });
  }
}
