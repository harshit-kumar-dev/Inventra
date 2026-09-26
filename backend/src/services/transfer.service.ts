import { prisma, DocumentStatus } from '../config/db';
import { StockEngineService } from './stockEngine.service';

export class TransferService {
  /**
   * Generate next auto-increment reference: <SourceWarehouseCode>/INT/<0001>
   */
  private static async generateReferenceNumber(warehouseId: string): Promise<string> {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const whCode = warehouse ? warehouse.code : 'WH';

    const count = await prisma.internalTransfer.count({
      where: { sourceWarehouseId: warehouseId },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `${whCode}/INT/${nextNumber}`;
  }

  /**
   * List Transfers with pagination and filters
   */
  static async getTransfers(query: {
    status?: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED' | 'ALL';
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
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

    if (query.sourceWarehouseId) where.sourceWarehouseId = query.sourceWarehouseId;
    if (query.destinationWarehouseId) where.destinationWarehouseId = query.destinationWarehouseId;

    if (query.productId) {
      where.lines = { some: { productId: query.productId } };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { responsible: { contains: s, mode: 'insensitive' } },
        { sourceWarehouse: { name: { contains: s, mode: 'insensitive' } } },
        { destinationWarehouse: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.scheduleDate = {};
      if (query.startDate) where.scheduleDate.gte = new Date(query.startDate);
      if (query.endDate) where.scheduleDate.lte = new Date(query.endDate);
    }

    const [total, transfers] = await Promise.all([
      prisma.internalTransfer.count({ where }),
      prisma.internalTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceWarehouse: { select: { id: true, name: true, code: true } },
          destinationWarehouse: { select: { id: true, name: true, code: true } },
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
              sourceLocation: { select: { id: true, name: true, code: true } },
              destinationLocation: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    const formatted = transfers.map((t) => {
      const isLate =
        t.status !== DocumentStatus.DONE &&
        t.status !== DocumentStatus.CANCELED &&
        new Date(t.scheduleDate) < new Date();

      return {
        ...t,
        isLate,
        totalQuantity: t.lines.reduce((acc, l) => acc + l.quantity, 0),
        totalItems: t.lines.length,
      };
    });

    return {
      transfers: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single transfer by ID
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
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
            sourceLocation: true,
            destinationLocation: true,
          },
        },
      },
    });

    if (!transfer) {
      throw { statusCode: 404, message: 'Internal transfer not found.' };
    }

    const isLate =
      transfer.status !== DocumentStatus.DONE &&
      transfer.status !== DocumentStatus.CANCELED &&
      new Date(transfer.scheduleDate) < new Date();

    return {
      ...transfer,
      isLate,
      totalQuantity: transfer.lines.reduce((acc, l) => acc + l.quantity, 0),
    };
  }

  /**
   * Create Internal Transfer (Initial status: DRAFT)
   */
  static async createTransfer(
    data: {
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      scheduleDate: Date;
      responsible?: string;
      notes?: string;
      lines: {
        productId: string;
        sourceLocationId: string;
        destinationLocationId: string;
        quantity: number;
      }[];
    },
    userId: string
  ) {
    // Validate Warehouses
    const sourceWh = await prisma.warehouse.findUnique({ where: { id: data.sourceWarehouseId } });
    if (!sourceWh) throw { statusCode: 400, message: 'Source warehouse does not exist.' };

    const destWh = await prisma.warehouse.findUnique({ where: { id: data.destinationWarehouseId } });
    if (!destWh) throw { statusCode: 400, message: 'Destination warehouse does not exist.' };

    // Validate Lines
    for (const line of data.lines) {
      if (line.quantity <= 0) {
        throw { statusCode: 400, message: 'Line quantity must be greater than zero.' };
      }

      if (line.sourceLocationId === line.destinationLocationId) {
        throw { statusCode: 400, message: 'Source and destination locations cannot be the same.' };
      }

      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) throw { statusCode: 400, message: `Product '${line.productId}' not found.` };

      const sourceLoc = await prisma.location.findUnique({ where: { id: line.sourceLocationId } });
      if (!sourceLoc || sourceLoc.warehouseId !== data.sourceWarehouseId) {
        throw {
          statusCode: 400,
          message: `Source location '${sourceLoc?.name}' does not belong to source warehouse '${sourceWh.name}'.`,
        };
      }

      const destLoc = await prisma.location.findUnique({ where: { id: line.destinationLocationId } });
      if (!destLoc || destLoc.warehouseId !== data.destinationWarehouseId) {
        throw {
          statusCode: 400,
          message: `Destination location '${destLoc?.name}' does not belong to destination warehouse '${destWh.name}'.`,
        };
      }
    }

    const referenceNo = await this.generateReferenceNumber(data.sourceWarehouseId);

    return prisma.internalTransfer.create({
      data: {
        referenceNo,
        sourceWarehouseId: data.sourceWarehouseId,
        destinationWarehouseId: data.destinationWarehouseId,
        status: DocumentStatus.DRAFT,
        scheduleDate: data.scheduleDate,
        responsible: data.responsible?.trim(),
        notes: data.notes?.trim(),
        createdBy: userId,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            sourceLocationId: l.sourceLocationId,
            destinationLocationId: l.destinationLocationId,
            quantity: l.quantity,
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        lines: {
          include: {
            product: true,
            sourceLocation: true,
            destinationLocation: true,
          },
        },
      },
    });
  }

  /**
   * Edit Draft Transfer
   */
  static async updateTransfer(
    id: string,
    data: {
      sourceWarehouseId?: string;
      destinationWarehouseId?: string;
      scheduleDate?: Date;
      responsible?: string;
      notes?: string;
      lines?: {
        productId: string;
        sourceLocationId: string;
        destinationLocationId: string;
        quantity: number;
      }[];
    }
  ) {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!transfer) throw { statusCode: 404, message: 'Internal transfer not found.' };

    if (transfer.status === DocumentStatus.DONE || transfer.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: `Cannot modify an internal transfer in ${transfer.status} status.` };
    }

    const sourceWhId = data.sourceWarehouseId || transfer.sourceWarehouseId;
    const destWhId = data.destinationWarehouseId || transfer.destinationWarehouseId;

    if (data.lines) {
      for (const line of data.lines) {
        if (line.quantity <= 0) {
          throw { statusCode: 400, message: 'Line quantity must be greater than zero.' };
        }
        if (line.sourceLocationId === line.destinationLocationId) {
          throw { statusCode: 400, message: 'Source and destination locations cannot be identical.' };
        }
        const sourceLoc = await prisma.location.findUnique({ where: { id: line.sourceLocationId } });
        if (!sourceLoc || sourceLoc.warehouseId !== sourceWhId) {
          throw { statusCode: 400, message: 'Source location is invalid for source warehouse.' };
        }
        const destLoc = await prisma.location.findUnique({ where: { id: line.destinationLocationId } });
        if (!destLoc || destLoc.warehouseId !== destWhId) {
          throw { statusCode: 400, message: 'Destination location is invalid for destination warehouse.' };
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.transferLine.deleteMany({ where: { transferId: id } });
        await tx.transferLine.createMany({
          data: data.lines.map((l) => ({
            transferId: id,
            productId: l.productId,
            sourceLocationId: l.sourceLocationId,
            destinationLocationId: l.destinationLocationId,
            quantity: l.quantity,
          })),
        });
      }

      return tx.internalTransfer.update({
        where: { id },
        data: {
          ...(data.sourceWarehouseId && { sourceWarehouseId: data.sourceWarehouseId }),
          ...(data.destinationWarehouseId && { destinationWarehouseId: data.destinationWarehouseId }),
          ...(data.scheduleDate && { scheduleDate: data.scheduleDate }),
          ...(data.responsible !== undefined && { responsible: data.responsible?.trim() }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() }),
        },
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          lines: {
            include: { product: true, sourceLocation: true, destinationLocation: true },
          },
        },
      });
    });
  }

  /**
   * Move from DRAFT to READY
   */
  static async markReady(id: string) {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        lines: {
          include: { product: true, sourceLocation: true },
        },
      },
    });

    if (!transfer) throw { statusCode: 404, message: 'Internal transfer not found.' };

    if (transfer.status !== DocumentStatus.DRAFT) {
      throw { statusCode: 400, message: `Cannot move transfer in ${transfer.status} status to READY.` };
    }

    // Verify source stock availability
    for (const line of transfer.lines) {
      const available = await StockEngineService.getAvailableStock(line.productId, line.sourceLocationId);
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Cannot mark READY: Insufficient source stock for '${line.product.name}' in '${line.sourceLocation.name}'. Available: ${available}, Needed: ${line.quantity}.`,
        };
      }
    }

    return prisma.internalTransfer.update({
      where: { id },
      data: { status: DocumentStatus.READY },
      include: { sourceWarehouse: true, destinationWarehouse: true, lines: true },
    });
  }

  /**
   * Validate Transfer (Atomically decreases source, increases destination, logs dual ledger entries)
   */
  static async validateTransfer(id: string, userId: string) {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        lines: {
          include: { product: true, sourceLocation: true, destinationLocation: true },
        },
      },
    });

    if (!transfer) throw { statusCode: 404, message: 'Internal transfer not found.' };

    if (transfer.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Transfer has already been validated and completed.' };
    }

    if (transfer.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Cannot validate a canceled transfer.' };
    }

    if (transfer.lines.length === 0) {
      throw { statusCode: 400, message: 'Cannot validate a transfer with no lines.' };
    }

    // Pre-flight check: Verify all source locations have sufficient stock
    for (const line of transfer.lines) {
      const available = await StockEngineService.getAvailableStock(line.productId, line.sourceLocationId);
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Validation failed: Insufficient source stock for '${line.product.name}' in '${line.sourceLocation.name}'. Available: ${available}, Required: ${line.quantity}.`,
        };
      }
    }

    // Execute atomic transaction
    return prisma.$transaction(async (tx) => {
      // 1. Process each transfer line atomically
      for (const line of transfer.lines) {
        await StockEngineService.moveStock(tx, {
          productId: line.productId,
          sourceWarehouseId: transfer.sourceWarehouseId,
          sourceLocationId: line.sourceLocationId,
          destinationWarehouseId: transfer.destinationWarehouseId,
          destinationLocationId: line.destinationLocationId,
          quantity: line.quantity,
          referenceType: 'INTERNAL_TRANSFER',
          referenceId: transfer.referenceNo,
          createdBy: userId,
        });
      }

      // 2. Mark transfer as DONE
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id },
        data: {
          status: DocumentStatus.DONE,
          validatedBy: userId,
        },
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          creator: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
          lines: {
            include: { product: true, sourceLocation: true, destinationLocation: true },
          },
        },
      });

      return updatedTransfer;
      },
      { maxWait: 10000, timeout: 25000 }
    );
  }

  /**
   * Cancel Transfer
   */
  static async cancelTransfer(id: string) {
    const transfer = await prisma.internalTransfer.findUnique({ where: { id } });
    if (!transfer) throw { statusCode: 404, message: 'Internal transfer not found.' };

    if (transfer.status === DocumentStatus.DONE) {
      throw { statusCode: 400, message: 'Cannot cancel an already completed transfer.' };
    }

    if (transfer.status === DocumentStatus.CANCELED) {
      throw { statusCode: 400, message: 'Transfer is already canceled.' };
    }

    return prisma.internalTransfer.update({
      where: { id },
      data: { status: DocumentStatus.CANCELED },
      include: { sourceWarehouse: true, destinationWarehouse: true, lines: true },
    });
  }
}
