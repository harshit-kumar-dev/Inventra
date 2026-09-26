import { prisma, Prisma, OperationType } from '../config/db';

export interface IncreaseStockParams {
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  createdBy?: string;
}

export interface DecreaseStockParams {
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  createdBy?: string;
}

export interface MoveStockParams {
  productId: string;
  sourceWarehouseId: string;
  sourceLocationId: string;
  destinationWarehouseId: string;
  destinationLocationId: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  createdBy?: string;
}

export interface AdjustStockParams {
  productId: string;
  warehouseId: string;
  locationId: string;
  countedQuantity: number;
  reason?: string;
  referenceType?: string;
  referenceId: string;
  createdBy?: string;
}

export class StockEngineService {
  /**
   * Increase Stock in a location atomically within a Prisma transaction
   */
  static async increaseStock(
    tx: Prisma.TransactionClient,
    params: IncreaseStockParams
  ) {
    if (params.quantity <= 0) {
      throw { statusCode: 400, message: 'Stock increase quantity must be greater than zero.' };
    }

    // 1. Upsert StockQuantity
    const stockQuantity = await tx.stockQuantity.upsert({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.locationId,
        },
      },
      update: {
        quantity: { increment: params.quantity },
      },
      create: {
        productId: params.productId,
        locationId: params.locationId,
        quantity: params.quantity,
      },
    });

    // 2. Append to StockLedger
    const ledgerEntry = await tx.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        operationType: OperationType.RECEIPT,
        quantity: params.quantity,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        balanceAfter: stockQuantity.quantity,
        createdBy: params.createdBy || null,
      },
    });

    return { stockQuantity, ledgerEntry };
  }

  /**
   * Decrease Stock from a location atomically within a Prisma transaction
   * Enforces zero-floor stock check.
   */
  static async decreaseStock(
    tx: Prisma.TransactionClient,
    params: DecreaseStockParams
  ) {
    if (params.quantity <= 0) {
      throw { statusCode: 400, message: 'Stock decrease quantity must be greater than zero.' };
    }

    // 1. Fetch current stock
    const currentStock = await tx.stockQuantity.findUnique({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.locationId,
        },
      },
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { name: true, code: true } },
      },
    });

    const availableQuantity = currentStock?.quantity || 0;

    if (availableQuantity < params.quantity) {
      const productName = currentStock?.product?.name || params.productId;
      const locationName = currentStock?.location?.name || params.locationId;
      throw {
        statusCode: 400,
        message: `Insufficient stock for '${productName}' in location '${locationName}'. Available: ${availableQuantity}, Requested: ${params.quantity}.`,
      };
    }

    // 2. Decrement StockQuantity
    const updatedStock = await tx.stockQuantity.update({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.locationId,
        },
      },
      data: {
        quantity: { decrement: params.quantity },
      },
    });

    // 3. Append to StockLedger (negative signed quantity)
    const ledgerEntry = await tx.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        operationType: OperationType.DELIVERY,
        quantity: -Math.abs(params.quantity),
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        balanceAfter: updatedStock.quantity,
        createdBy: params.createdBy || null,
      },
    });

    return { stockQuantity: updatedStock, ledgerEntry };
  }

  /**
   * Move Stock between locations atomically within a Prisma transaction
   */
  static async moveStock(
    tx: Prisma.TransactionClient,
    params: MoveStockParams
  ) {
    if (params.quantity <= 0) {
      throw { statusCode: 400, message: 'Transfer quantity must be greater than zero.' };
    }

    if (params.sourceLocationId === params.destinationLocationId) {
      throw { statusCode: 400, message: 'Source and destination locations must be different.' };
    }

    // 1. Check and decrease source location
    const sourceStock = await tx.stockQuantity.findUnique({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.sourceLocationId,
        },
      },
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { name: true } },
      },
    });

    const availableSource = sourceStock?.quantity || 0;
    if (availableSource < params.quantity) {
      const prodName = sourceStock?.product?.name || params.productId;
      throw {
        statusCode: 400,
        message: `Insufficient stock for '${prodName}' in source location '${sourceStock?.location?.name}'. Available: ${availableSource}, Requested: ${params.quantity}.`,
      };
    }

    const updatedSource = await tx.stockQuantity.update({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.sourceLocationId,
        },
      },
      data: {
        quantity: { decrement: params.quantity },
      },
    });

    // 2. Increase destination location
    const updatedDest = await tx.stockQuantity.upsert({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.destinationLocationId,
        },
      },
      update: {
        quantity: { increment: params.quantity },
      },
      create: {
        productId: params.productId,
        locationId: params.destinationLocationId,
        quantity: params.quantity,
      },
    });

    // 3. Create dual ledger entries (TRANSFER_OUT & TRANSFER_IN)
    const [ledgerOut, ledgerIn] = await Promise.all([
      tx.stockLedger.create({
        data: {
          productId: params.productId,
          warehouseId: params.sourceWarehouseId,
          locationId: params.sourceLocationId,
          operationType: OperationType.TRANSFER_OUT,
          quantity: -Math.abs(params.quantity),
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          balanceAfter: updatedSource.quantity,
          createdBy: params.createdBy || null,
        },
      }),
      tx.stockLedger.create({
        data: {
          productId: params.productId,
          warehouseId: params.destinationWarehouseId,
          locationId: params.destinationLocationId,
          operationType: OperationType.TRANSFER_IN,
          quantity: params.quantity,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          balanceAfter: updatedDest.quantity,
          createdBy: params.createdBy || null,
        },
      }),
    ]);

    return { updatedSource, updatedDest, ledgerOut, ledgerIn };
  }

  /**
   * Adjust Stock physically within a Prisma transaction
   */
  static async adjustStock(
    tx: Prisma.TransactionClient,
    params: AdjustStockParams
  ) {
    if (params.countedQuantity < 0) {
      throw { statusCode: 400, message: 'Counted quantity cannot be negative.' };
    }

    // 1. Fetch current recorded quantity
    const currentStock = await tx.stockQuantity.findUnique({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.locationId,
        },
      },
    });

    const previousQuantity = currentStock?.quantity || 0;
    const delta = params.countedQuantity - previousQuantity;

    // 2. Upsert stock quantity to the counted quantity
    const updatedStock = await tx.stockQuantity.upsert({
      where: {
        productId_locationId: {
          productId: params.productId,
          locationId: params.locationId,
        },
      },
      update: {
        quantity: params.countedQuantity,
      },
      create: {
        productId: params.productId,
        locationId: params.locationId,
        quantity: params.countedQuantity,
      },
    });

    // 3. Append to StockLedger with signed delta
    const ledgerEntry = await tx.stockLedger.create({
      data: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        operationType: OperationType.ADJUSTMENT,
        quantity: delta,
        referenceType: params.referenceType || 'ADJUSTMENT',
        referenceId: params.referenceId,
        balanceAfter: updatedStock.quantity,
        createdBy: params.createdBy || null,
      },
    });

    return { previousQuantity, countedQuantity: params.countedQuantity, delta, updatedStock, ledgerEntry };
  }

  /**
   * Get available stock for a product at a specific location
   */
  static async getAvailableStock(productId: string, locationId: string): Promise<number> {
    const stock = await prisma.stockQuantity.findUnique({
      where: {
        productId_locationId: { productId, locationId },
      },
    });
    return stock?.quantity || 0;
  }

  /**
   * Query Stock with multi-dimensional filters and pagination
   */
  static async queryStock(query: {
    productId?: string;
    warehouseId?: string;
    locationId?: string;
    status?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NORMAL';
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.productId) where.productId = query.productId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.warehouseId) {
      where.location = { warehouseId: query.warehouseId };
    }

    if (query.search) {
      const s = query.search.trim();
      where.product = {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { sku: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const [total, stockItems] = await Promise.all([
      prisma.stockQuantity.count({ where }),
      prisma.stockQuantity.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ product: { name: 'asc' } }, { location: { name: 'asc' } }],
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
              uom: { select: { id: true, name: true, symbol: true } },
            },
          },
          location: {
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    const formatted = stockItems.map((item) => {
      let stockStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'NORMAL';
      if (item.quantity <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (item.quantity <= item.product.reorderLevel) {
        stockStatus = 'LOW_STOCK';
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        category: item.product.category.name,
        uom: item.product.uom.symbol,
        perUnitCost: item.product.perUnitCost,
        reorderLevel: item.product.reorderLevel,
        locationId: item.locationId,
        locationName: item.location.name,
        locationCode: item.location.code,
        warehouseId: item.location.warehouse.id,
        warehouseName: item.location.warehouse.name,
        warehouseCode: item.location.warehouse.code,
        quantity: item.quantity,
        stockStatus,
        updatedAt: item.updatedAt,
      };
    });

    return {
      stock: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Stock Ledger History with filters & pagination
   */
  static async getLedgerHistory(query: {
    productId?: string;
    warehouseId?: string;
    locationId?: string;
    operationType?: OperationType;
    referenceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.operationType) where.operationType = query.operationType;
    if (query.referenceId) {
      where.referenceId = { contains: query.referenceId.trim(), mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, entries] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, uom: { select: { symbol: true } } },
          },
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const formatted = entries.map((e) => ({
      id: e.id,
      productId: e.productId,
      productName: e.product.name,
      sku: e.product.sku,
      uom: e.product.uom.symbol,
      warehouseName: e.warehouse.name,
      warehouseCode: e.warehouse.code,
      locationName: e.location.name,
      locationCode: e.location.code,
      operationType: e.operationType,
      quantity: e.quantity,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      balanceAfter: e.balanceAfter,
      createdBy: e.creator ? e.creator.name : 'System',
      createdAt: e.createdAt,
    }));

    return {
      ledger: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Low Stock and Out of Stock summary alerts
   */
  static async getStockAlerts() {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: { select: { name: true } },
        uom: { select: { symbol: true } },
        stockQuantities: {
          include: {
            location: {
              include: { warehouse: { select: { name: true, code: true } } },
            },
          },
        },
      },
    });

    const lowStockItems: any[] = [];
    const outOfStockItems: any[] = [];

    for (const p of products) {
      const totalStock = p.stockQuantities.reduce((acc, sq) => acc + sq.quantity, 0);

      if (totalStock <= 0) {
        outOfStockItems.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category.name,
          uom: p.uom.symbol,
          currentStock: 0,
          reorderLevel: p.reorderLevel,
          status: 'OUT_OF_STOCK',
        });
      } else if (totalStock <= p.reorderLevel) {
        lowStockItems.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category.name,
          uom: p.uom.symbol,
          currentStock: totalStock,
          reorderLevel: p.reorderLevel,
          deficit: p.reorderLevel - totalStock,
          status: 'LOW_STOCK',
        });
      }
    }

    return {
      summary: {
        totalProducts: products.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
      },
      lowStockItems,
      outOfStockItems,
    };
  }
}
